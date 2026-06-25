const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/stats/scorers?limit=10
router.get('/scorers', async (req, res) => {
const limit = Math.min(parseInt(req.query.limit) || 10, 50); // plafonné à 50

try {
    const result = await pool.query(
    `SELECT p.name AS player, t.name AS team, t.code,
            ps.goals, ps.assists
    FROM player_stats ps
    JOIN players p ON p.id = ps.player_id
    JOIN teams   t ON t.id = p.team_id
    ORDER BY ps.goals DESC, ps.assists DESC
    LIMIT $1`,
    [limit]
    );
    res.json({ scorers: result.rows });
} catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
}
});

// GET /api/stats/standings
router.get('/standings', async (req, res) => {
try {
    const result = await pool.query(`
    WITH results AS (
        SELECT home_team_id AS team_id, home_score AS gf, away_score AS ga,
            CASE WHEN home_score > away_score THEN 3
                    WHEN home_score = away_score THEN 1 ELSE 0 END AS pts
        FROM matches WHERE status = 'finished'
        UNION ALL
        SELECT away_team_id, away_score, home_score,
            CASE WHEN away_score > home_score THEN 3
                    WHEN away_score = home_score THEN 1 ELSE 0 END AS pts
        FROM matches WHERE status = 'finished'
    )
    SELECT t.name AS team, t.code, t.group_letter,
            COUNT(r.team_id)               AS played,
            COALESCE(SUM(r.pts), 0)        AS points,
            COALESCE(SUM(r.gf), 0)         AS goals_for,
            COALESCE(SUM(r.ga), 0)         AS goals_against,
            COALESCE(SUM(r.gf - r.ga), 0)  AS goal_diff
    FROM teams t
    LEFT JOIN results r ON r.team_id = t.id
    GROUP BY t.id, t.name, t.code, t.group_letter
    ORDER BY t.group_letter, points DESC, goal_diff DESC
    `);
    res.json({ standings: result.rows });
} catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
}
});

module.exports = router;