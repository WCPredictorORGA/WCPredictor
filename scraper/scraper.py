import os
import requests
import psycopg2
import random
import string
from datetime import datetime

# ==============================================================================
# 1. CONFIGURATION DE LA BASE DE DONNÉES
# ==============================================================================
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "worldcup2026"
DB_USER = "wcpredictor"
DB_PASSWORD = "mon_super_mdp_2026"

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

# ==============================================================================
# 2. NETTOYAGE CRUCIAL DE LA BDD (Bye bye 2018 & 2022)
# ==============================================================================
def purge_old_editions():
    """Supprime les matchs de 2018/2022 et nettoie les équipes obsolètes."""
    print("🧹 Nettoyage de la base de données...")
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Supprimer tous les matchs qui ne sont pas en 2026
        cursor.execute("DELETE FROM matches WHERE EXTRACT(YEAR FROM match_datetime) != 2026;")
        deleted_matches = cursor.rowcount
        print(f"   • {deleted_matches} anciens matchs supprimés.")

        # 2. Supprimer les équipes qui ne sont plus liées à aucun match restant
        cursor.execute("""
            DELETE FROM teams 
            WHERE id NOT IN (
                SELECT home_team_id FROM matches
                UNION
                SELECT away_team_id FROM matches
            );
        """)
        deleted_teams = cursor.rowcount
        print(f"   • {deleted_teams} équipes obsolètes ou placeholders nettoyés.")

        conn.commit()
        print("✨ Base de données nettoyée avec succès ! Place à 2026.")

    except Exception as e:
        print(f"❌ Erreur lors de la purge de la BDD : {e}")
        if conn: conn.rollback()
    finally:
        if conn:
            cursor.close()
            conn.close()

# ==============================================================================
# 3. UTILITAIRES D'INSERTION
# ==============================================================================
ISO_TEAM_CODES = {
    "France": "FRA", "Brazil": "BRA", "Argentina": "ARG", "Germany": "GER", 
    "Spain": "ESP", "England": "ENG", "Italy": "ITA", "Portugal": "POR",
    "Netherlands": "NED", "Belgium": "BEL", "Croatia": "CRO", "Uruguay": "URU",
    "Mexico": "MEX", "Japan": "JPN", "Morocco": "MAR", "Senegal": "SEN",
    "United States": "USA", "Canada": "CAN", "Saudi Arabia": "KSA"
}

def get_or_create_team(cursor, team_raw):
    """Récupère l'ID d'une équipe ou la crée si elle n'existe pas."""
    if isinstance(team_raw, dict):
        name = team_raw.get("name", "Inconnu")
        code = team_raw.get("code", name[:3].upper())
    else:
        name = str(team_raw)
        code = ISO_TEAM_CODES.get(name, name[:3].upper())

    code = code[:3].upper()

    cursor.execute("SELECT id FROM teams WHERE name = %s", (name,))
    row = cursor.fetchone()
    if row:
        return row[0]

    cursor.execute("SELECT id FROM teams WHERE code = %s", (code,))
    if cursor.fetchone():
        while True:
            code = code[:2] + random.choice(string.ascii_uppercase)
            cursor.execute("SELECT id FROM teams WHERE code = %s", (code,))
            if not cursor.fetchone():
                break

    cursor.execute("INSERT INTO teams (name, code) VALUES (%s, %s) RETURNING id", (name, code))
    return cursor.fetchone()[0]

def determine_match_stage(match_data):
    round_name = str(match_data.get("round", "")).lower()
    group_name = str(match_data.get("group", "")).lower()

    if "group" in group_name or "group" in round_name: return "group"
    if "32" in round_name: return "round32"
    if "16" in round_name or "huit" in round_name: return "round16"
    if "quarter" in round_name or "quart" in round_name: return "quarter"
    if "semi" in round_name or "demi" in round_name: return "semi"
    if "final" in round_name: return "final"
    return "group"

# ==============================================================================
# 4. IMPORTATION UNIQUE DE L'ÉDITION 2026
# ==============================================================================
def import_world_cup_data(url, edition_name):
    print(f"\n🚀 Démarrage de l'importation : {edition_name}...")
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"❌ Impossible de récupérer les données : {e}")
        return

    matches = []
    if "matches" in data and isinstance(data["matches"], list):
        matches = data["matches"]
    elif "rounds" in data and isinstance(data["rounds"], list):
        for r in data["rounds"]:
            if isinstance(r, dict) and "matches" in r and isinstance(r["matches"], list):
                matches.extend(r["matches"])
            
    print(f"📊 {len(matches)} matchs identifiés dans le flux 2026.")
    if not matches:
        return

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        for match in matches:
            home_team_id = get_or_create_team(cursor, match.get("team1") or match.get("homeTeam"))
            away_team_id = get_or_create_team(cursor, match.get("team2") or match.get("awayTeam"))

            date_str = match.get("date")
            time_str = match.get("time", "00:00")
            match_datetime = f"{date_str}T{time_str}:00Z" if time_str and len(time_str) == 5 else f"{date_str}T00:00:00Z"

            stage = determine_match_stage(match)
            group_raw = match.get("group")
            group_letter = None
            if group_raw and "group" in str(group_raw).lower():
                parts = str(group_raw).split()
                if len(parts) >= 2:
                    group_letter = parts[1].strip()[:1].upper()

            stadium_raw = match.get("stadium")
            stadium = stadium_raw.get("name") if isinstance(stadium_raw, dict) else (str(stadium_raw) if stadium_raw else None)

            home_score, away_score, status = None, None, "scheduled"

            cursor.execute(
                "SELECT id FROM matches WHERE home_team_id = %s AND away_team_id = %s AND match_datetime = %s",
                (home_team_id, away_team_id, match_datetime)
            )
            existing_match = cursor.fetchone()

            if existing_match:
                cursor.execute(
                    """
                    UPDATE matches 
                    SET home_score = %s, away_score = %s, status = %s, stadium = %s, stage = %s, group_letter = %s
                    WHERE id = %s
                    """,
                    (home_score, away_score, status, stadium, stage, group_letter, existing_match[0])
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status, home_score, away_score)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status, home_score, away_score)
                )

        conn.commit()
        print(f"✅ Édition {edition_name} synchronisée avec succès.")

    except Exception as e:
        print(f"❌ Erreur lors du traitement : {e}")
        if conn: conn.rollback()
    finally:
        if conn:
            cursor.close()
            conn.close()

# ==============================================================================
# 5. EXECUTION
# ==============================================================================
if __name__ == "__main__":
    # 1. On nettoie l'ancien contenu d'abord
    purge_old_editions()
    
    # 2. On importe uniquement le fichier cible de 2026
    URL_2026 = "https://raw.githubusercontent.com/upbound-web/worldcup-live.json/master/2026/worldcup.json"
    import_world_cup_data(URL_2026, "Coupe du Monde 2026")