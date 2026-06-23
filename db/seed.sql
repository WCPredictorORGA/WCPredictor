INSERT INTO teams (name, code, group_letter) VALUES
    ('France', 'FRA', 'A'),
    ('Brésil', 'BRA', 'A'),
    ('Argentine', 'ARG', 'B'),
    ('Espagne', 'ESP', 'B')
ON CONFLICT (code) DO NOTHING;

INSERT INTO matches (home_team_id, away_team_id, match_datetime, stage, group_letter, status)
VALUES
    ((SELECT id FROM teams WHERE code='FRA'), (SELECT id FROM teams WHERE code='BRA'),
    '2026-06-25 18:00:00+00', 'group', 'A', 'scheduled'),
    ((SELECT id FROM teams WHERE code='ARG'), (SELECT id FROM teams WHERE code='ESP'),
    '2026-06-26 21:00:00+00', 'group', 'B', 'scheduled');