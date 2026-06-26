-- Types énumérés (sécurité et propreté de la BDD)
CREATE TYPE user_role    AS ENUM ('admin', 'user');
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'finished');
CREATE TYPE match_stage  AS ENUM ('group','round32','round16','quarter','semi','final');

-- Table des utilisateurs
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Table des équipes nationales
CREATE TABLE teams (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL UNIQUE,
  code         CHAR(3)      NOT NULL UNIQUE,     -- FRA, BRA, ARG...
  group_letter CHAR(1),
  flag_url     TEXT
);

-- Table des matchs
CREATE TABLE matches (
  id             SERIAL PRIMARY KEY,
  home_team_id   INT NOT NULL REFERENCES teams(id),
  away_team_id   INT NOT NULL REFERENCES teams(id),
  match_datetime TIMESTAMPTZ  NOT NULL,
  stage          match_stage  NOT NULL DEFAULT 'group',
  group_letter   CHAR(1),
  stadium        VARCHAR(100),
  status         match_status NOT NULL DEFAULT 'scheduled',
  home_score     SMALLINT CHECK (home_score >= 0),
  away_score     SMALLINT CHECK (away_score >= 0),
  CHECK (home_team_id <> away_team_id),
  UNIQUE (home_team_id, away_team_id)
);

-- Table des joueurs (pour les buteurs)
CREATE TABLE players (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  team_id  INT REFERENCES teams(id) ON DELETE CASCADE,
  position VARCHAR(20)
);

-- Statistiques des joueurs (alimentées par le scraper)
CREATE TABLE player_stats (
  id         SERIAL PRIMARY KEY,
  player_id  INT NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  goals      SMALLINT NOT NULL DEFAULT 0,
  assists    SMALLINT NOT NULL DEFAULT 0,
  minutes    INT      NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pronostics des joueurs humains
CREATE TABLE predictions (
  id             SERIAL PRIMARY KEY,
  user_id        INT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  match_id       INT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  pred_home      SMALLINT NOT NULL CHECK (pred_home >= 0),
  pred_away      SMALLINT NOT NULL CHECK (pred_away >= 0),
  points_awarded SMALLINT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)        -- Empêche un joueur de voter 2 fois pour le même match
);

-- Pronostics de l'IA (Bot)
CREATE TABLE bot_predictions (
  id            SERIAL PRIMARY KEY,
  match_id      INT NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  pred_home     SMALLINT NOT NULL CHECK (pred_home >= 0),
  pred_away     SMALLINT NOT NULL CHECK (pred_away >= 0),
  prob_home_win NUMERIC(5,4),
  prob_draw     NUMERIC(5,4),
  prob_away_win NUMERIC(5,4),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vue SQL : Le classement en temps réel (Leaderboard)
CREATE VIEW leaderboard AS
SELECT u.id   AS user_id,
    u.username,
    COUNT(p.points_awarded)        AS matches_scored,
    COALESCE(SUM(p.points_awarded), 0) AS total_points
FROM users u
LEFT JOIN predictions p ON p.user_id = u.id
GROUP BY u.id, u.username
ORDER BY total_points DESC;