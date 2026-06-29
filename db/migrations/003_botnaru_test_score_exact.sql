-- Migration 003 : Insère un pronostic "score exact" pour Botnaru
-- sur le premier match terminé où il n'a pas encore de prédiction.
-- Résultat attendu : Botnaru = 1 match joué, 3 pts, 1 score exact.

INSERT INTO predictions (user_id, match_id, pred_home, pred_away, points_awarded)
SELECT
  u.id          AS user_id,
  m.id          AS match_id,
  m.home_score  AS pred_home,   -- identique au résultat réel → score exact
  m.away_score  AS pred_away,
  3             AS points_awarded
FROM users u
CROSS JOIN (
  SELECT m.id, m.home_score, m.away_score
  FROM matches m
  WHERE m.status      = 'finished'
    AND m.home_score  IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM predictions p
      JOIN users bot ON bot.id = p.user_id AND bot.username = 'Botnaru'
      WHERE p.match_id = m.id
    )
  ORDER BY m.match_datetime ASC
  LIMIT 1
) m
WHERE u.username = 'Botnaru'
ON CONFLICT (user_id, match_id) DO UPDATE
  SET pred_home      = EXCLUDED.pred_home,
      pred_away      = EXCLUDED.pred_away,
      points_awarded = 3;
