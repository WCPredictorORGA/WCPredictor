const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const { scorePredictions } = require('../scoring');
const { rules, handle } = require('../middleware/validate');

const router = express.Router();

// GET — liste des matchs (public) avec filtres optionnels
router.get('/', async (req, res) => {
    const { group, stage, status, team, sort, order } = req.query;

    const conditions = [];
    const params = [];

    if (group)  { params.push(group);        conditions.push(`m.group_letter = $${params.length}`); }
    if (stage)  { params.push(stage);        conditions.push(`m.stage = $${params.length}`); }
    if (status) { params.push(status);       conditions.push(`m.status = $${params.length}`); }
    if (team)   { params.push(`%${team}%`);  conditions.push(`(ht.name ILIKE $${params.length} OR at.name ILIKE $${params.length})`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Liste blanche des colonnes triables (évite l'injection via le paramètre sort)
    const SORTABLE = { date: 'm.match_datetime', group: 'm.group_letter' };
    const sortCol = SORTABLE[sort] || 'm.match_datetime';
    const sortDir = order === 'desc' ? 'DESC' : 'ASC';

    try {
        const result = await pool.query(
            `SELECT m.id, ht.name AS home_team, at.name AS away_team,
                    ht.code AS home_team_code, at.code AS away_team_code,
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

// POST /:id/result — saisir le score (admin uniquement)
router.post('/:id/result', authenticate, rules.matchResult, handle, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }

    const matchId = req.params.id; // déjà coercé en int par validate
    const { home_score, away_score } = req.body;

    try {
        const existing = await pool.query('SELECT id FROM matches WHERE id = $1', [matchId]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Match introuvable' });
        }

        await pool.query(
            `UPDATE matches SET home_score = $1, away_score = $2, status = 'finished' WHERE id = $3`,
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
