"""
WCPredictor — Scraper CdM 2026
Source : https://raw.githubusercontent.com/upbound-web/worldcup-live.json/master/2026/worldcup.json

Importe équipes, matchs, résultats et buteurs depuis ce JSON public.
Lance : python scraper.py
"""

import os
import re
import sys
import json
import logging
import threading
from datetime import datetime, timedelta, timezone
from collections import defaultdict

import requests
import psycopg2
from flask import Flask, jsonify

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://wcp:changeme@db:5432/wcpredictor"
)

JSON_URL = (
    "https://raw.githubusercontent.com/upbound-web/worldcup-live.json"
    "/master/2026/worldcup.json"
)

HEADERS = {"User-Agent": "WCPredictor-scraper/2.0 (github.com/baubiez/WCPredictor)"}

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Codes FIFA par nom anglais (source JSON)
# ---------------------------------------------------------------------------

TEAM_CODES: dict[str, str] = {
    "France": "FRA", "Brazil": "BRA", "Argentina": "ARG", "Spain": "ESP",
    "Germany": "GER", "England": "ENG", "Portugal": "POR", "Belgium": "BEL",
    "Netherlands": "NED", "Italy": "ITA", "Croatia": "CRO", "Serbia": "SRB",
    "Switzerland": "SUI", "Denmark": "DEN", "Sweden": "SWE", "Norway": "NOR",
    "Poland": "POL", "Ukraine": "UKR", "Austria": "AUT", "Czech Republic": "CZE",
    "Slovakia": "SVK", "Hungary": "HUN", "Romania": "ROU", "Greece": "GRE",
    "Turkey": "TUR", "Scotland": "SCO", "Wales": "WAL", "Ireland": "IRL",
    "Morocco": "MAR", "Senegal": "SEN", "Tunisia": "TUN", "Egypt": "EGY",
    "Cameroon": "CMR", "Ghana": "GHA", "Nigeria": "NGA", "Algeria": "ALG",
    "Ivory Coast": "CIV", "Mali": "MLI", "South Africa": "RSA", "Kenya": "KEN",
    "DR Congo": "COD", "Congo DR": "COD", "Togo": "TOG", "Namibia": "NAM",
    "USA": "USA", "Mexico": "MEX", "Canada": "CAN", "Honduras": "HON",
    "Costa Rica": "CRC", "Panama": "PAN", "Haiti": "HAI", "Jamaica": "JAM",
    "Guatemala": "GUA", "El Salvador": "SLV", "Cuba": "CUB",
    "Uruguay": "URU", "Colombia": "COL", "Ecuador": "ECU", "Peru": "PER",
    "Chile": "CHI", "Bolivia": "BOL", "Paraguay": "PAR", "Venezuela": "VEN",
    "Japan": "JPN", "South Korea": "KOR", "Iran": "IRN", "Saudi Arabia": "KSA",
    "Australia": "AUS", "New Zealand": "NZL", "Indonesia": "IDN",
    "Philippines": "PHI", "Thailand": "THA", "Vietnam": "VIE",
    "Qatar": "QAT", "UAE": "UAE", "Bahrain": "BHR", "Kuwait": "KUW",
    "Jordan": "JOR", "Iraq": "IRQ", "Yemen": "YEM",
    "China": "CHN", "India": "IND", "Uzbekistan": "UZB",
}

# Mapping "round" → valeur de l'enum match_stage
STAGE_MAP: dict[str, str] = {
    "group":     "group",
    "round of 32": "round32",
    "round of 16": "round16",
    "quarter":   "quarter",
    "semi":      "semi",
    "third":     "semi",
    "final":     "final",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def team_code(name: str) -> str:
    if name in TEAM_CODES:
        return TEAM_CODES[name]
    # Génère un code de 3 lettres depuis les premières lettres des mots
    words = name.upper().split()
    if len(words) == 1:
        return words[0][:3]
    return "".join(w[0] for w in words)[:3]


def parse_stage(round_str: str) -> str:
    rl = round_str.lower()
    for key, val in STAGE_MAP.items():
        if key in rl:
            return val
    return "group"


def parse_datetime_utc(date_str: str, time_str: str) -> datetime:
    """
    Convertit une date "YYYY-MM-DD" et un temps "HH:MM UTC+X" en datetime UTC.
    """
    m = re.match(r"(\d{2}):(\d{2})\s*UTC([+-]\d+)?", time_str or "")
    if m:
        hour, minute = int(m.group(1)), int(m.group(2))
        offset_h = int(m.group(3)) if m.group(3) else 0
    else:
        hour, minute, offset_h = 0, 0, 0

    y, mo, d = int(date_str[:4]), int(date_str[5:7]), int(date_str[8:10])
    naive = datetime(y, mo, d, hour, minute)
    return (naive - timedelta(hours=offset_h)).replace(tzinfo=timezone.utc)


def is_placeholder(name: str) -> bool:
    """
    Vrai si le nom est un placeholder de phase éliminatoire.
    Exemples : '1A', '2B', 'W73', 'L101', 'Winner Group A'
    """
    if not name:
        return True
    # Codes position (ex: "1A", "2B", "W73", "L12")
    if re.match(r"^[0-9WL]\w*$", name):
        return True
    # Phrases descriptives (ex: "Winner Group A", "Runner-up Group B")
    if re.search(r"\b(winner|runner|loser|group)\b", name, re.IGNORECASE):
        return True
    return False


def parse_group(group_str: str) -> str | None:
    """Extrait la lettre de groupe depuis 'Group A', 'A', 'group-a', etc."""
    if not group_str:
        return None
    m = re.search(r'([A-La-l])$', group_str.strip())
    return m.group(1).upper() if m else None


# ---------------------------------------------------------------------------
# Fetch JSON
# ---------------------------------------------------------------------------

def fetch_json() -> dict:
    log.info("GET %s", JSON_URL)
    r = requests.get(JSON_URL, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------

def extract_teams(matches: list[dict]) -> dict[str, dict]:
    """
    Retourne { team_name: { code, group_letter } } pour toutes les équipes
    réelles trouvées dans les matchs de groupe.
    """
    teams: dict[str, dict] = {}
    for m in matches:
        group = m.get("group", "")
        for key in ("team1", "team2"):
            name = m.get(key, "")
            if name and not is_placeholder(name) and name not in teams:
                gl = parse_group(group)
                teams[name] = {"code": team_code(name), "group": gl}
    return teams


def extract_matches(raw_matches: list[dict], team_id_map: dict[str, int]) -> list[dict]:
    """
    Retourne la liste des matchs à insérer/mettre à jour.
    """
    result = []
    for m in raw_matches:
        t1, t2 = m.get("team1", ""), m.get("team2", "")
        if is_placeholder(t1) or is_placeholder(t2):
            continue
        if t1 not in team_id_map or t2 not in team_id_map:
            log.debug("Équipe inconnue : %s ou %s — ignoré", t1, t2)
            continue

        score = m.get("score", {})
        ft = score.get("ft")
        status = "finished" if ft else "scheduled"

        result.append({
            "home_team_id":   team_id_map[t1],
            "away_team_id":   team_id_map[t2],
            "match_datetime": parse_datetime_utc(m.get("date", "2026-01-01"), m.get("time", "")),
            "stage":          parse_stage(m.get("round", "")),
            "group_letter":   parse_group(m.get("group", "")),
            "stadium":        m.get("ground", ""),
            "status":         status,
            "home_score":     ft[0] if ft else None,
            "away_score":     ft[1] if ft else None,
        })
    return result


def extract_goals(raw_matches: list[dict]) -> dict[str, dict]:
    """
    Agrège les buts par joueur.
    Retourne { player_name: { goals, team_name } }.
    """
    players: dict[str, dict] = {}
    for m in raw_matches:
        for side, key in (("team1", "goals1"), ("team2", "goals2")):
            team_name = m.get(side, "")
            for g in m.get(key, []):
                name = g.get("name", "").strip()
                if not name or g.get("owngoal"):
                    continue
                if name not in players:
                    players[name] = {"goals": 0, "team": team_name}
                players[name]["goals"] += 1
    return players


# ---------------------------------------------------------------------------
# Écriture en base
# ---------------------------------------------------------------------------

def insert_teams(conn, teams: dict[str, dict]) -> dict[str, int]:
    """Insère les équipes et retourne { name: id }."""
    team_id_map: dict[str, int] = {}
    with conn.cursor() as cur:
        for name, info in teams.items():
            cur.execute(
                """
                INSERT INTO teams (name, code, group_letter)
                VALUES (%s, %s, %s)
                ON CONFLICT (code) DO UPDATE
                    SET name = EXCLUDED.name,
                        group_letter = EXCLUDED.group_letter
                RETURNING id
                """,
                (name, info["code"], info["group"]),
            )
            team_id_map[name] = cur.fetchone()[0]
    conn.commit()
    log.info("%d équipes insérées.", len(team_id_map))
    return team_id_map


def insert_matches(conn, matches: list[dict]) -> dict[tuple, int]:
    """Insère ou met à jour les matchs. Retourne { (home_id, away_id): match_id }."""
    match_id_map: dict[tuple, int] = {}
    with conn.cursor() as cur:
        for m in matches:
            cur.execute(
                """
                INSERT INTO matches
                    (home_team_id, away_team_id, match_datetime,
                     stage, group_letter, stadium, status, home_score, away_score)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (home_team_id, away_team_id) DO UPDATE SET
                    match_datetime = EXCLUDED.match_datetime,
                    stage          = EXCLUDED.stage,
                    group_letter   = EXCLUDED.group_letter,
                    stadium        = EXCLUDED.stadium,
                    -- Le statut ne peut qu'avancer (jamais rétrograder depuis 'finished')
                    status     = CASE
                                     WHEN EXCLUDED.status = 'finished' THEN 'finished'::match_status
                                     WHEN matches.status  = 'finished' THEN 'finished'::match_status
                                     ELSE EXCLUDED.status
                                 END,
                    -- Les scores de la source écrasent, sauf si admin les a déjà saisis
                    home_score = COALESCE(EXCLUDED.home_score, matches.home_score),
                    away_score = COALESCE(EXCLUDED.away_score, matches.away_score)
                RETURNING id
                """,
                (
                    m["home_team_id"], m["away_team_id"], m["match_datetime"],
                    m["stage"], m["group_letter"], m["stadium"], m["status"],
                    m["home_score"], m["away_score"],
                ),
            )
            mid = cur.fetchone()[0]
            match_id_map[(m["home_team_id"], m["away_team_id"])] = mid
    conn.commit()
    log.info(
        "%d matchs importés (%d terminés).",
        len(matches),
        sum(1 for m in matches if m["status"] == "finished"),
    )
    return match_id_map


def score_predictions(conn):
    """
    Calcule les points de tous les pronostics dont le match est terminé.
    Score exact = 3 pts | bon résultat (vainqueur ou nul) = 1 pt | sinon 0.
    Idempotent : recalcule à chaque passage (auto-correctif si un score change).
    Reproduit la logique de backend/src/scoring.js.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE predictions p
            SET points_awarded = CASE
                WHEN p.pred_home = m.home_score AND p.pred_away = m.away_score THEN 3
                WHEN sign(p.pred_home - p.pred_away) = sign(m.home_score - m.away_score) THEN 1
                ELSE 0
            END
            FROM matches m
            WHERE p.match_id = m.id
              AND m.status = 'finished'
              AND m.home_score IS NOT NULL
              AND m.away_score IS NOT NULL
            """
        )
        updated = cur.rowcount
    conn.commit()
    log.info("%d pronostics notés.", updated)


def insert_scorers(conn, players_data: dict[str, dict], team_id_map: dict[str, int]):
    """Insère les joueurs et leurs stats de buts, liés à leur équipe."""
    if not players_data:
        return
    with conn.cursor() as cur:
        for player_name, info in sorted(players_data.items(), key=lambda x: -x[1]["goals"]):
            team_name = info["team"]
            team_id   = team_id_map.get(team_name)

            # Vérifier si le joueur existe déjà (pas de UNIQUE sur name)
            cur.execute(
                "SELECT id FROM players WHERE name = %s AND team_id IS NOT DISTINCT FROM %s",
                (player_name, team_id),
            )
            row = cur.fetchone()
            if row:
                player_id = row[0]
            else:
                cur.execute(
                    "INSERT INTO players (name, team_id, position) VALUES (%s, %s, 'FW') RETURNING id",
                    (player_name, team_id),
                )
                player_id = cur.fetchone()[0]

            cur.execute(
                """
                INSERT INTO player_stats (player_id, goals, assists, minutes)
                VALUES (%s, %s, 0, 0)
                ON CONFLICT (player_id) DO UPDATE
                    SET goals = EXCLUDED.goals, updated_at = now()
                """,
                (player_id, info["goals"]),
            )
    conn.commit()
    log.info("%d buteurs insérés.", len(players_data))


# ---------------------------------------------------------------------------
# Point d'entrée
# ---------------------------------------------------------------------------

def main():
    data = fetch_json()
    raw_matches = data.get("matches", [])
    log.info("JSON chargé : %d matchs au total.", len(raw_matches))

    conn = psycopg2.connect(DATABASE_URL)
    log.info("Connecté à la base de données.")

    try:
        teams      = extract_teams(raw_matches)
        team_id_map = insert_teams(conn, teams)

        matches = extract_matches(raw_matches, team_id_map)
        insert_matches(conn, matches)

        # Calcule les points des pronostics pour les matchs désormais terminés
        score_predictions(conn)

        players_data = extract_goals(raw_matches)
        insert_scorers(conn, players_data, team_id_map)

        log.info("Import terminé.")

    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Mode serveur HTTP (--serve) : permet de déclencher le scraping via API REST
# ---------------------------------------------------------------------------

_flask_app = Flask(__name__)
_lock = threading.Lock()
_status: dict = {"running": False, "last": None}

# Fuseau horaire et heure du scraping automatique quotidien
SCHEDULE_TZ   = os.environ.get("SCRAPER_TZ", "Europe/Paris")
SCHEDULE_HOUR = int(os.environ.get("SCRAPER_HOUR", "10"))


def _run_scrape(trigger: str) -> bool:
    """
    Lance un scraping en arrière-plan si aucun n'est déjà en cours.
    Renvoie False si un scraping tourne déjà (verrou non acquis).
    Partagé par le déclencheur HTTP manuel et le planificateur quotidien.
    """
    if not _lock.acquire(blocking=False):
        log.warning("Scraping ignoré (déjà en cours) — déclencheur : %s", trigger)
        return False

    def run():
        _status["running"] = True
        log.info("Scraping démarré (déclencheur : %s).", trigger)
        try:
            main()
            _status["last"] = {
                "success": True,
                "trigger": trigger,
                "at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as exc:
            log.error("Scraping échoué : %s", exc)
            _status["last"] = {
                "success": False,
                "trigger": trigger,
                "error": str(exc),
                "at": datetime.now(timezone.utc).isoformat(),
            }
        finally:
            _status["running"] = False
            _lock.release()

    threading.Thread(target=run, daemon=True).start()
    return True

#TEST FUNCTION
@_flask_app.route("/scrape", methods=["POST"])
def trigger_scrape():
    if not _run_scrape("manuel"):
        return jsonify({"error": "Scraping déjà en cours"}), 409
    return jsonify({"message": "Scraping démarré"}), 202


@_flask_app.route("/status", methods=["GET"])
def get_status():
    return jsonify(_status)


def _start_scheduler():
    """Planifie un scraping automatique tous les jours à SCHEDULE_HOUR h00."""
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger

    scheduler = BackgroundScheduler(timezone=SCHEDULE_TZ)
    scheduler.add_job(
        lambda: _run_scrape("planifié"),
        CronTrigger(hour=SCHEDULE_HOUR, minute=0),
        id="daily_scrape",
        misfire_grace_time=3600,   # tolère 1 h de retard (ex : redémarrage du conteneur)
    )
    scheduler.start()
    log.info("Scraping quotidien planifié à %02dh00 (%s).", SCHEDULE_HOUR, SCHEDULE_TZ)


if __name__ == "__main__":
    if "--serve" in sys.argv:
        _start_scheduler()
        port = int(os.environ.get("PORT", 5001))
        log.info("Mode serveur démarré sur le port %d.", port)
        _flask_app.run(host="0.0.0.0", port=port, debug=False)
    else:
        main()
