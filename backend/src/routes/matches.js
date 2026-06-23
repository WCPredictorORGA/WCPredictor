const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const { scorePredictions } = require('../scoring');

const router = express.Router();

// Liste des matchs (public)
router.get('/', async (req, res) => {
    try {
    const result = await pool.query(
    `SELECT m.id, ht.name AS home_team, at.name AS away_team,
            m.match_datetime, m.status, m.home_score, m.away_score,
            m.stage, m.group_letter
    FROM matches m
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    ORDER BY m.match_datetime`
    );
    res.json({ matches: result.rows });
} catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
}
});

// Saisir le résultat d'un match (ADMIN uniquement) + calculer les points
router.post('/:id/result', authenticate, async (req, res) => {
if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Réservé aux administrateurs' });
}

const matchId = req.params.id;
const { home_score, away_score } = req.body;
if (home_score == null || away_score == null) {
    return res.status(400).json({ error: 'Score manquant' });
}

try {
    await pool.query(
    `UPDATE matches SET home_score = $1, away_score = $2, status = 'finished'
    WHERE id = $3`,
    [home_score, away_score, matchId]
    );

    await scorePredictions(matchId, home_score, away_score);

    res.json({ message: 'Résultat enregistré, points calculés' });
} catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
}
});

module.exports = router;