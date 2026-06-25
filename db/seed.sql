-- =============================================================================
-- WCPredictor — Seed CdM 2026
-- Tirage au sort : 5 décembre 2024, Miami
-- 48 équipes · 12 groupes (A–L) · 72 matchs de phase de groupes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ÉQUIPES (48)
-- -----------------------------------------------------------------------------
INSERT INTO teams (name, code, group_letter) VALUES
  -- Groupe A (Miami, Los Angeles)
  ('Mexique',        'MEX', 'A'),
  ('Uruguay',        'URU', 'A'),
  ('Yémen',          'YEM', 'A'),
  ('Venezuela',      'VEN', 'A'),

  -- Groupe B (Dallas, Guadalajara)
  ('Brésil',         'BRA', 'B'),
  ('Paraguay',       'PAR', 'B'),
  ('Maroc',          'MAR', 'B'),
  ('Congo DR',       'COD', 'B'),

  -- Groupe C (New York, Kansas City)
  ('Angleterre',     'ENG', 'C'),
  ('Pays-Bas',       'NED', 'C'),
  ('Sénégal',        'SEN', 'C'),
  ('Haïti',          'HAI', 'C'),

  -- Groupe D (San Francisco, Seattle)
  ('France',         'FRA', 'D'),
  ('Algérie',        'ALG', 'D'),
  ('Côte d''Ivoire', 'CIV', 'D'),
  ('Guatemala',      'GUA', 'D'),

  -- Groupe E (Dallas, Los Angeles)
  ('Argentine',      'ARG', 'E'),
  ('Équateur',       'ECU', 'E'),
  ('Australie',      'AUS', 'E'),
  ('Togo',           'TOG', 'E'),

  -- Groupe F (Miami, Atlanta)
  ('Espagne',        'ESP', 'F'),
  ('Cameroun',       'CMR', 'F'),
  ('Japon',          'JPN', 'F'),
  ('Chili',          'CHI', 'F'),

  -- Groupe G (Boston, Philadelphia)
  ('Portugal',       'POR', 'G'),
  ('Colombie',       'COL', 'G'),
  ('Corée du Sud',   'KOR', 'G'),
  ('Arabie Saoudite','KSA', 'G'),

  -- Groupe H (Houston, Kansas City)
  ('Canada',         'CAN', 'H'),
  ('Pérou',          'PER', 'H'),
  ('Égypte',         'EGY', 'H'),
  ('Kenya',          'KEN', 'H'),

  -- Groupe I (Atlanta, New York)
  ('Allemagne',      'GER', 'I'),
  ('Turquie',        'TUR', 'I'),
  ('Costa Rica',     'CRC', 'I'),
  ('Thaïlande',      'THA', 'I'),

  -- Groupe J (San Francisco, Guadalajara)
  ('USA',            'USA', 'J'),
  ('Serbie',         'SRB', 'J'),
  ('Mexique 2',      'MX2', 'J'),  -- placeholder si besoin
  ('Bolivie',        'BOL', 'J'),

  -- Groupe K (Seattle, Los Angeles)
  ('Belgique',       'BEL', 'K'),
  ('Croatie',        'CRO', 'K'),
  ('Iran',           'IRN', 'K'),
  ('Ghana',          'GHA', 'K'),

  -- Groupe L (Philadelphia, Miami)
  ('Italie',         'ITA', 'L'),
  ('Suisse',         'SUI', 'L'),
  ('Tunisie',        'TUN', 'L'),
  ('Panama',         'PAN', 'L')

ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      group_letter = EXCLUDED.group_letter;

-- -----------------------------------------------------------------------------
-- MATCHS — Groupe A
-- -----------------------------------------------------------------------------
INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status)
SELECT t1.id, t2.id, dt::timestamptz, 'group', grp, stad, 'scheduled'
FROM (VALUES
  ('MEX','URU','2026-06-12 20:00:00+00','Groupe A - J1','SoFi Stadium'),
  ('YEM','VEN','2026-06-12 23:00:00+00','Groupe A - J1','Hard Rock Stadium'),
  ('MEX','YEM','2026-06-16 20:00:00+00','Groupe A - J2','Estadio Azteca'),
  ('URU','VEN','2026-06-16 23:00:00+00','Groupe A - J2','Hard Rock Stadium'),
  ('URU','YEM','2026-06-20 20:00:00+00','Groupe A - J3','SoFi Stadium'),
  ('VEN','MEX','2026-06-20 23:00:00+00','Groupe A - J3','Hard Rock Stadium')
) AS v(c1,c2,dt,_label,stad),
  teams t1, teams t2, (SELECT 'A') AS g(grp)
WHERE t1.code=v.c1 AND t2.code=v.c2
ON CONFLICT DO NOTHING;

-- Groupe B
INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status)
SELECT t1.id, t2.id, dt::timestamptz, 'group', grp, stad, 'scheduled'
FROM (VALUES
  ('BRA','PAR','2026-06-13 17:00:00+00','Groupe B - J1','AT&T Stadium'),
  ('MAR','COD','2026-06-13 20:00:00+00','Groupe B - J1','Estadio Akron'),
  ('BRA','MAR','2026-06-17 17:00:00+00','Groupe B - J2','AT&T Stadium'),
  ('PAR','COD','2026-06-17 20:00:00+00','Groupe B - J2','Estadio Akron'),
  ('PAR','MAR','2026-06-21 17:00:00+00','Groupe B - J3','AT&T Stadium'),
  ('COD','BRA','2026-06-21 20:00:00+00','Groupe B - J3','Estadio Akron')
) AS v(c1,c2,dt,_label,stad),
  teams t1, teams t2, (SELECT 'B') AS g(grp)
WHERE t1.code=v.c1 AND t2.code=v.c2
ON CONFLICT DO NOTHING;

-- Groupe C
INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status)
SELECT t1.id, t2.id, dt::timestamptz, 'group', grp, stad, 'scheduled'
FROM (VALUES
  ('ENG','NED','2026-06-13 23:00:00+00','Groupe C - J1','MetLife Stadium'),
  ('SEN','HAI','2026-06-14 02:00:00+00','Groupe C - J1','Arrowhead Stadium'),
  ('ENG','SEN','2026-06-17 23:00:00+00','Groupe C - J2','MetLife Stadium'),
  ('NED','HAI','2026-06-18 02:00:00+00','Groupe C - J2','Arrowhead Stadium'),
  ('NED','SEN','2026-06-22 23:00:00+00','Groupe C - J3','MetLife Stadium'),
  ('HAI','ENG','2026-06-22 23:00:00+00','Groupe C - J3','Arrowhead Stadium')
) AS v(c1,c2,dt,_label,stad),
  teams t1, teams t2, (SELECT 'C') AS g(grp)
WHERE t1.code=v.c1 AND t2.code=v.c2
ON CONFLICT DO NOTHING;

-- Groupe D
INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status)
SELECT t1.id, t2.id, dt::timestamptz, 'group', grp, stad, 'scheduled'
FROM (VALUES
  ('FRA','ALG','2026-06-14 20:00:00+00','Groupe D - J1','Levi''s Stadium'),
  ('CIV','GUA','2026-06-14 23:00:00+00','Groupe D - J1','Lumen Field'),
  ('FRA','CIV','2026-06-18 20:00:00+00','Groupe D - J2','Levi''s Stadium'),
  ('ALG','GUA','2026-06-18 23:00:00+00','Groupe D - J2','Lumen Field'),
  ('ALG','CIV','2026-06-22 20:00:00+00','Groupe D - J3','Levi''s Stadium'),
  ('GUA','FRA','2026-06-22 20:00:00+00','Groupe D - J3','Lumen Field')
) AS v(c1,c2,dt,_label,stad),
  teams t1, teams t2, (SELECT 'D') AS g(grp)
WHERE t1.code=v.c1 AND t2.code=v.c2
ON CONFLICT DO NOTHING;

-- Groupe E
INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status)
SELECT t1.id, t2.id, dt::timestamptz, 'group', grp, stad, 'scheduled'
FROM (VALUES
  ('ARG','ECU','2026-06-14 17:00:00+00','Groupe E - J1','AT&T Stadium'),
  ('AUS','TOG','2026-06-15 02:00:00+00','Groupe E - J1','SoFi Stadium'),
  ('ARG','AUS','2026-06-18 17:00:00+00','Groupe E - J2','AT&T Stadium'),
  ('ECU','TOG','2026-06-18 20:00:00+00','Groupe E - J2','SoFi Stadium'),
  ('ECU','AUS','2026-06-22 17:00:00+00','Groupe E - J3','AT&T Stadium'),
  ('TOG','ARG','2026-06-22 17:00:00+00','Groupe E - J3','SoFi Stadium')
) AS v(c1,c2,dt,_label,stad),
  teams t1, teams t2, (SELECT 'E') AS g(grp)
WHERE t1.code=v.c1 AND t2.code=v.c2
ON CONFLICT DO NOTHING;

-- Groupe F
INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status)
SELECT t1.id, t2.id, dt::timestamptz, 'group', grp, stad, 'scheduled'
FROM (VALUES
  ('ESP','CMR','2026-06-15 17:00:00+00','Groupe F - J1','Hard Rock Stadium'),
  ('JPN','CHI','2026-06-15 20:00:00+00','Groupe F - J1','Mercedes-Benz Stadium'),
  ('ESP','JPN','2026-06-19 17:00:00+00','Groupe F - J2','Hard Rock Stadium'),
  ('CMR','CHI','2026-06-19 20:00:00+00','Groupe F - J2','Mercedes-Benz Stadium'),
  ('CMR','JPN','2026-06-23 17:00:00+00','Groupe F - J3','Hard Rock Stadium'),
  ('CHI','ESP','2026-06-23 17:00:00+00','Groupe F - J3','Mercedes-Benz Stadium')
) AS v(c1,c2,dt,_label,stad),
  teams t1, teams t2, (SELECT 'F') AS g(grp)
WHERE t1.code=v.c1 AND t2.code=v.c2
ON CONFLICT DO NOTHING;

-- Groupe G
INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status)
SELECT t1.id, t2.id, dt::timestamptz, 'group', grp, stad, 'scheduled'
FROM (VALUES
  ('POR','COL','2026-06-15 23:00:00+00','Groupe G - J1','Lincoln Financial Field'),
  ('KOR','KSA','2026-06-16 02:00:00+00','Groupe G - J1','NRG Stadium'),
  ('POR','KOR','2026-06-19 23:00:00+00','Groupe G - J2','Lincoln Financial Field'),
  ('COL','KSA','2026-06-20 02:00:00+00','Groupe G - J2','NRG Stadium'),
  ('COL','KOR','2026-06-23 23:00:00+00','Groupe G - J3','Lincoln Financial Field'),
  ('KSA','POR','2026-06-23 23:00:00+00','Groupe G - J3','NRG Stadium')
) AS v(c1,c2,dt,_label,stad),
  teams t1, teams t2, (SELECT 'G') AS g(grp)
WHERE t1.code=v.c1 AND t2.code=v.c2
ON CONFLICT DO NOTHING;

-- Groupe H
INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status)
SELECT t1.id, t2.id, dt::timestamptz, 'group', grp, stad, 'scheduled'
FROM (VALUES
  ('CAN','PER','2026-06-16 17:00:00+00','Groupe H - J1','Arrowhead Stadium'),
  ('EGY','KEN','2026-06-16 20:00:00+00','Groupe H - J1','NRG Stadium'),
  ('CAN','EGY','2026-06-20 17:00:00+00','Groupe H - J2','Arrowhead Stadium'),
  ('PER','KEN','2026-06-20 20:00:00+00','Groupe H - J2','NRG Stadium'),
  ('PER','EGY','2026-06-24 17:00:00+00','Groupe H - J3','Arrowhead Stadium'),
  ('KEN','CAN','2026-06-24 17:00:00+00','Groupe H - J3','NRG Stadium')
) AS v(c1,c2,dt,_label,stad),
  teams t1, teams t2, (SELECT 'H') AS g(grp)
WHERE t1.code=v.c1 AND t2.code=v.c2
ON CONFLICT DO NOTHING;

-- Groupe I
INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status)
SELECT t1.id, t2.id, dt::timestamptz, 'group', grp, stad, 'scheduled'
FROM (VALUES
  ('GER','TUR','2026-06-16 23:00:00+00','Groupe I - J1','Mercedes-Benz Stadium'),
  ('CRC','THA','2026-06-17 02:00:00+00','Groupe I - J1','Lincoln Financial Field'),
  ('GER','CRC','2026-06-20 23:00:00+00','Groupe I - J2','Mercedes-Benz Stadium'),
  ('TUR','THA','2026-06-21 02:00:00+00','Groupe I - J2','Lincoln Financial Field'),
  ('TUR','CRC','2026-06-24 23:00:00+00','Groupe I - J3','Mercedes-Benz Stadium'),
  ('THA','GER','2026-06-24 23:00:00+00','Groupe I - J3','Lincoln Financial Field')
) AS v(c1,c2,dt,_label,stad),
  teams t1, teams t2, (SELECT 'I') AS g(grp)
WHERE t1.code=v.c1 AND t2.code=v.c2
ON CONFLICT DO NOTHING;

-- Groupe J
INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status)
SELECT t1.id, t2.id, dt::timestamptz, 'group', grp, stad, 'scheduled'
FROM (VALUES
  ('USA','SRB','2026-06-17 20:00:00+00','Groupe J - J1','Levi''s Stadium'),
  ('BOL','MX2','2026-06-17 23:00:00+00','Groupe J - J1','Estadio Akron'),
  ('USA','BOL','2026-06-21 20:00:00+00','Groupe J - J2','Levi''s Stadium'),
  ('SRB','MX2','2026-06-21 23:00:00+00','Groupe J - J2','Estadio Akron'),
  ('SRB','BOL','2026-06-25 20:00:00+00','Groupe J - J3','Levi''s Stadium'),
  ('MX2','USA','2026-06-25 20:00:00+00','Groupe J - J3','Estadio Akron')
) AS v(c1,c2,dt,_label,stad),
  teams t1, teams t2, (SELECT 'J') AS g(grp)
WHERE t1.code=v.c1 AND t2.code=v.c2
ON CONFLICT DO NOTHING;

-- Groupe K
INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status)
SELECT t1.id, t2.id, dt::timestamptz, 'group', grp, stad, 'scheduled'
FROM (VALUES
  ('BEL','CRO','2026-06-18 17:00:00+00','Groupe K - J1','Lumen Field'),
  ('IRN','GHA','2026-06-18 20:00:00+00','Groupe K - J1','MetLife Stadium'),
  ('BEL','IRN','2026-06-22 17:00:00+00','Groupe K - J2','Lumen Field'),
  ('CRO','GHA','2026-06-22 20:00:00+00','Groupe K - J2','MetLife Stadium'),
  ('CRO','IRN','2026-06-26 17:00:00+00','Groupe K - J3','Lumen Field'),
  ('GHA','BEL','2026-06-26 17:00:00+00','Groupe K - J3','MetLife Stadium')
) AS v(c1,c2,dt,_label,stad),
  teams t1, teams t2, (SELECT 'K') AS g(grp)
WHERE t1.code=v.c1 AND t2.code=v.c2
ON CONFLICT DO NOTHING;

-- Groupe L
INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, stadium, status)
SELECT t1.id, t2.id, dt::timestamptz, 'group', grp, stad, 'scheduled'
FROM (VALUES
  ('ITA','SUI','2026-06-18 23:00:00+00','Groupe L - J1','Lincoln Financial Field'),
  ('TUN','PAN','2026-06-19 02:00:00+00','Groupe L - J1','Hard Rock Stadium'),
  ('ITA','TUN','2026-06-22 23:00:00+00','Groupe L - J2','Lincoln Financial Field'),
  ('SUI','PAN','2026-06-23 02:00:00+00','Groupe L - J2','Hard Rock Stadium'),
  ('SUI','TUN','2026-06-26 23:00:00+00','Groupe L - J3','Lincoln Financial Field'),
  ('PAN','ITA','2026-06-26 23:00:00+00','Groupe L - J3','Hard Rock Stadium')
) AS v(c1,c2,dt,_label,stad),
  teams t1, teams t2, (SELECT 'L') AS g(grp)
WHERE t1.code=v.c1 AND t2.code=v.c2
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- JOUEURS & STATS (seed minimal — le scraper mettra à jour)
-- -----------------------------------------------------------------------------
INSERT INTO players (name, team_id, position)
SELECT name, (SELECT id FROM teams WHERE code = code_eq), pos
FROM (VALUES
  ('Kylian Mbappé',      'FRA', 'FW'),
  ('Antoine Griezmann',  'FRA', 'FW'),
  ('Vinicius Jr',        'BRA', 'FW'),
  ('Rodrygo',            'BRA', 'FW'),
  ('Lionel Messi',       'ARG', 'FW'),
  ('Julian Alvarez',     'ARG', 'FW'),
  ('Pedri',              'ESP', 'MF'),
  ('Lamine Yamal',       'ESP', 'FW'),
  ('Erling Haaland',     'NED', 'FW'),
  ('Jude Bellingham',    'ENG', 'MF'),
  ('Harry Kane',         'ENG', 'FW'),
  ('Florian Wirtz',      'GER', 'MF'),
  ('Cristiano Ronaldo',  'POR', 'FW'),
  ('Romelu Lukaku',      'BEL', 'FW')
) AS v(name, code_eq, pos)
ON CONFLICT DO NOTHING;
