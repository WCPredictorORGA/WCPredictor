const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  const userId = req.user.id;                  // vient du token, pas du client
    const { match_id, pred_home, pred_away } = req.body;

    if (match_id == null || pred_home == null || pred_away == null) {
    return res.status(400).json({ error: 'Champs manquants' });
    }
    if (pred_home < 0 || pred_away < 0) {
    return res.status(400).json({ error: 'Les scores doivent être positifs' });
    }

    try {
    // Règle métier : on ne parie que sur un match pas encore commencé
    const match = await pool.query('SELECT status FROM matches WHERE id = $1', [match_id]);
    if (match.rows.length === 0) {
        return res.status(404).json({ error: 'Match introuvable' });
    }
    if (match.rows[0].status !== 'scheduled') {
        return res.status(403).json({ error: 'Ce match a déjà commencé' });
    }

    const result = await pool.query(
        `INSERT INTO predictions (user_id, match_id, pred_home, pred_away)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, match_id)
        DO UPDATE SET pred_home = EXCLUDED.pred_home,
            pred_away = EXCLUDED.pred_away
        RETURNING id, match_id, pred_home, pred_away`,
        [userId, match_id, pred_home, pred_away]
    );

    res.status(201).json({ prediction: result.rows[0] });
    } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/', authenticate, async (req, res) => {
    try {
    const result = await pool.query(
    `SELECT p.id, p.match_id, p.pred_home, p.pred_away, p.points_awarded,
            ht.name AS home_team, at.name AS away_team,
            m.match_datetime, m.status, m.home_score, m.away_score
    FROM predictions p
    JOIN matches m  ON m.id = p.match_id
    JOIN teams ht   ON ht.id = m.home_team_id
    JOIN teams at   ON at.id = m.away_team_id
    WHERE p.user_id = $1
    ORDER BY m.match_datetime`,
    [req.user.id]
    );
    res.json({ predictions: result.rows });
    } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;