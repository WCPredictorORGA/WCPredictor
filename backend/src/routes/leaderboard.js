const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (_req, res) => {
    try {
        // Colonnes explicites : pas de SELECT * pour éviter de fuite de données internes
        const result = await pool.query(
            `SELECT user_id, username, total_points, matches_scored
             FROM leaderboard
             ORDER BY total_points DESC`
        );
        res.json({ leaderboard: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
