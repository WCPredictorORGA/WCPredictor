"""
WCPredictor — Scraper CdM 2026
Source : https://raw.githubusercontent.com/upbound-web/worldcup-live.json/master/2026/worldcup.json

Importe équipes, matchs, résultats et buteurs depuis ce JSON public.
Lance : python scraper.py
"""

import os
import re
import json
import logging
from datetime import datetime, timedelta, timezone
from collections import defaultdict

import requests
import psycopg2

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
    """Vrai si le nom est un placeholder de phase éliminatoire (ex: '1A', 'W73')."""
    return bool(re.match(r"^[0-9WL]", name or ""))


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

def reset_game_data(conn):
    """
    Vide les tables dépendant des matchs et équipes (pas les users/predictions).
    Les predictions sont supprimées car les match_id vont changer.
    """
    with conn.cursor() as cur:
        cur.execute(
            "TRUNCATE bot_predictions, predictions, player_stats, players, "
            "matches, teams RESTART IDENTITY CASCADE"
        )
    conn.commit()
    log.info("Tables vidées.")


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
    """Insère les matchs et retourne { (home_id, away_id): match_id }."""
    match_id_map: dict[tuple, int] = {}
    with conn.cursor() as cur:
        for m in matches:
            cur.execute(
                """
                INSERT INTO matches
                    (home_team_id, away_team_id, match_datetime,
                     stage, group_letter, stadium, status, home_score, away_score)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
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
        "%d matchs insérés (%d terminés).",
        len(matches),
        sum(1 for m in matches if m["status"] == "finished"),
    )
    return match_id_map


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
        reset_game_data(conn)

        teams      = extract_teams(raw_matches)
        team_id_map = insert_teams(conn, teams)

        matches = extract_matches(raw_matches, team_id_map)
        insert_matches(conn, matches)

        players_data = extract_goals(raw_matches)
        insert_scorers(conn, players_data, team_id_map)

        log.info("Import terminé.")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
