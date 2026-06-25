"""
WCPredictor — Modèle de prédiction Poisson bivarié
Prédit les scores des matchs à venir.

Stratégie de calibration (par ordre de priorité) :
  1. Résultats des matchs terminés (plus fiable)
  2. Stats joueurs scrapées (player_stats) comme proxy d'attaque
     quand peu de matchs sont disponibles

Usage :
    python model.py
"""

import os
import logging
from itertools import product

import psycopg2
from scipy.stats import poisson

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://wcp:changeme@db:5432/wcpredictor")
MAX_GOALS = 6
# Poids donné aux stats joueurs vs matchs (0 = matchs only, 1 = stats only)
PLAYER_STATS_WEIGHT = 0.4

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lecture des données
# ---------------------------------------------------------------------------

def load_finished_matches(conn) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT m.home_team_id, m.away_team_id, m.home_score, m.away_score
            FROM matches m
            WHERE m.status = 'finished'
              AND m.home_score IS NOT NULL
              AND m.away_score IS NOT NULL
        """)
        cols = ["home_team_id", "away_team_id", "home_score", "away_score"]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def load_scheduled_matches(conn) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT m.id, m.home_team_id, m.away_team_id,
                   ht.name AS home_team, at.name AS away_team
            FROM matches m
            JOIN teams ht ON ht.id = m.home_team_id
            JOIN teams at ON at.id = m.away_team_id
            WHERE m.status = 'scheduled'
        """)
        cols = ["id", "home_team_id", "away_team_id", "home_team", "away_team"]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def load_all_teams(conn) -> list[int]:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM teams")
        return [row[0] for row in cur.fetchall()]


def load_player_stats_by_team(conn) -> dict:
    """
    Retourne { team_id: total_goals } à partir de player_stats.
    Utilisé comme proxy d'attaque quand peu de matchs sont disponibles.
    """
    with conn.cursor() as cur:
        cur.execute("""
            SELECT p.team_id, COALESCE(SUM(ps.goals), 0) AS total_goals
            FROM players p
            JOIN player_stats ps ON ps.player_id = p.id
            GROUP BY p.team_id
        """)
        return {row[0]: row[1] for row in cur.fetchall()}


# ---------------------------------------------------------------------------
# Calcul des forces
# ---------------------------------------------------------------------------

def compute_strengths(
    finished: list[dict],
    team_ids: list[int],
    player_goals: dict,
) -> tuple[dict, float]:
    """
    Force d'attaque/défense pour chaque équipe.

    - Si des matchs terminés existent : on les utilise pour attaque ET défense.
    - On complète l'attaque avec les player_stats scrapées (pondérées par
      PLAYER_STATS_WEIGHT) pour les équipes sans historique de match.
    - La défense sans match reste neutre (1.0) — on n'a pas de proxy fiable.
    """
    goals_scored   = {t: [] for t in team_ids}
    goals_conceded = {t: [] for t in team_ids}

    for m in finished:
        h, a = m["home_team_id"], m["away_team_id"]
        if h in goals_scored:
            goals_scored[h].append(m["home_score"])
            goals_conceded[h].append(m["away_score"])
        if a in goals_scored:
            goals_scored[a].append(m["away_score"])
            goals_conceded[a].append(m["home_score"])

    all_goals = [g for gs in goals_scored.values() for g in gs]
    # Référence mondiale : 2.5 buts/match (historique CdM) si pas de données
    global_avg = sum(all_goals) / max(len(all_goals), 1) if all_goals else 2.5

    # Attaque basée sur player_stats (goals par joueur de l'équipe)
    # Normalisée sur le même global_avg
    max_player_goals = max(player_goals.values(), default=1) or 1

    strengths = {}
    for t in team_ids:
        scored   = goals_scored[t]
        conceded = goals_conceded[t]

        # Lissage Laplacien : on ajoute un match fictif à global_avg pour chaque
        # équipe, ce qui évite les forces nulles ou infinies avec peu de données.
        PRIOR = 1  # nombre de matchs fictifs ajoutés
        if scored:
            smoothed_goals    = sum(scored)   + PRIOR * global_avg
            smoothed_matches  = len(scored)   + PRIOR
            attack = (smoothed_goals / smoothed_matches) / global_avg
        else:
            pg = player_goals.get(t, 0)
            if pg > 0:
                attack = max((pg / max_player_goals) * 1.5 / global_avg, 0.2)
            else:
                attack = 1.0

        if conceded:
            smoothed_conceded = sum(conceded) + PRIOR * global_avg
            smoothed_matches  = len(conceded) + PRIOR
            defense = (smoothed_conceded / smoothed_matches) / global_avg
        else:
            defense = 1.0

        strengths[t] = {"attack": attack, "defense": defense}

    log.info(
        "Forces calculées — %d équipes, avg %.2f buts/match (%d matchs terminés, %d équipes avec stats joueurs)",
        len(team_ids), global_avg, len(finished), len(player_goals),
    )
    return strengths, global_avg


# ---------------------------------------------------------------------------
# Prédiction pour un match
# ---------------------------------------------------------------------------

def predict_match(home_id: int, away_id: int, strengths: dict, global_avg: float) -> dict:
    """
    Calcule λ_home / λ_away puis dérive probabilités et score modal.
    """
    s_home = strengths.get(home_id, {"attack": 1.0, "defense": 1.0})
    s_away = strengths.get(away_id, {"attack": 1.0, "defense": 1.0})

    # Avantage terrain +8 %
    lam_home = s_home["attack"] * s_away["defense"] * global_avg * 1.08
    lam_away = s_away["attack"] * s_home["defense"] * global_avg

    score_probs = {}
    prob_home_win = prob_draw = prob_away_win = 0.0

    for h_goals, a_goals in product(range(MAX_GOALS + 1), repeat=2):
        p = poisson.pmf(h_goals, lam_home) * poisson.pmf(a_goals, lam_away)
        score_probs[(h_goals, a_goals)] = p
        if h_goals > a_goals:
            prob_home_win += p
        elif h_goals == a_goals:
            prob_draw += p
        else:
            prob_away_win += p

    best_score = max(score_probs, key=score_probs.get)

    return {
        "pred_home":     best_score[0],
        "pred_away":     best_score[1],
        "prob_home_win": round(prob_home_win, 4),
        "prob_draw":     round(prob_draw, 4),
        "prob_away_win": round(prob_away_win, 4),
    }


# ---------------------------------------------------------------------------
# Écriture en base
# ---------------------------------------------------------------------------

def upsert_prediction(conn, match_id: int, pred: dict):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO bot_predictions
                (match_id, pred_home, pred_away,
                 prob_home_win, prob_draw, prob_away_win)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (match_id) DO UPDATE
                SET pred_home     = EXCLUDED.pred_home,
                    pred_away     = EXCLUDED.pred_away,
                    prob_home_win = EXCLUDED.prob_home_win,
                    prob_draw     = EXCLUDED.prob_draw,
                    prob_away_win = EXCLUDED.prob_away_win,
                    created_at    = now()
        """, (
            match_id,
            pred["pred_home"], pred["pred_away"],
            pred["prob_home_win"], pred["prob_draw"], pred["prob_away_win"],
        ))
    conn.commit()


# ---------------------------------------------------------------------------
# Point d'entrée
# ---------------------------------------------------------------------------

def main():
    conn = psycopg2.connect(DATABASE_URL)
    log.info("Connecté à la base de données.")

    try:
        finished     = load_finished_matches(conn)
        scheduled    = load_scheduled_matches(conn)
        team_ids     = load_all_teams(conn)
        player_goals = load_player_stats_by_team(conn)

        log.info(
            "%d matchs terminés | %d à prédire | %d équipes avec stats joueurs",
            len(finished), len(scheduled), len(player_goals),
        )

        if not scheduled:
            log.info("Aucun match à prédire.")
            return

        strengths, global_avg = compute_strengths(finished, team_ids, player_goals)

        for match in scheduled:
            pred = predict_match(
                match["home_team_id"], match["away_team_id"],
                strengths, global_avg,
            )
            upsert_prediction(conn, match["id"], pred)
            log.info(
                "%-20s vs %-20s → %d–%d  (dom %.0f%% / nul %.0f%% / ext %.0f%%)",
                match["home_team"], match["away_team"],
                pred["pred_home"], pred["pred_away"],
                pred["prob_home_win"] * 100,
                pred["prob_draw"] * 100,
                pred["prob_away_win"] * 100,
            )

        log.info("Terminé — %d prédictions générées.", len(scheduled))

    finally:
        conn.close()


if __name__ == "__main__":
    main()
