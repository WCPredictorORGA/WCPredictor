const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const { scorePredictions } = require('../scoring');

const router = express.Router();

router.get('/', async (req, res) => {
const { group, stage, status, team, sort, order } = req.query;

const conditions = [];
const params = [];

if (group)  { params.push(group);          conditions.push(`m.group_letter = $${params.length}`); }
if (stage)  { params.push(stage);          conditions.push(`m.stage = $${params.length}`); }
if (status) { params.push(status);         conditions.push(`m.status = $${params.length}`); }
if (team)   { params.push(`%${team}%`);     conditions.push(`(ht.name ILIKE $${params.length} OR at.name ILIKE $${params.length})`); }

const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

// tri sécurisé : on n'autorise que des colonnes connues (liste blanche)
const sortable = { date: 'm.match_datetime', group: 'm.group_letter' };
const sortCol = sortable[sort] || 'm.match_datetime';
const sortDir = order === 'desc' ? 'DESC' : 'ASC';

try {
    const result = await pool.query(
    `SELECT m.id, ht.name AS home_team, at.name AS away_team,
            m.match_datetime, m.status, m.home_score, m.away_score,
            m.stage, m.group_letter
    FROM matches m
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    ${where}
    ORDER BY ${sortCol} ${sortDir}`,
    params
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