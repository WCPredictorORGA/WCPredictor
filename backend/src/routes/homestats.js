const express = require('express');
const pool = require('../db');
const router = express.Router();

/**
 * GET /api/home-stats
 * Données publiques pour la page d'accueil :
 *  - remaining_matches : nombre de matchs encore à jouer
 *  - top_player        : { username, total_points } du meilleur joueur
 *  - ai_winner         : { name, code } favori IA basé sur les points actuels + proba de victoire restante
 */
router.get('/', async (req, res) => {
    try {
        // 1. Matchs restants
        const remainingRes = await pool.query(
            `SELECT COUNT(*) AS cnt FROM matches WHERE status = 'scheduled'`
        );
        const remaining_matches = Number(remainingRes.rows[0].cnt);

        // 2. Meilleur joueur du classement (hors Botnaru, qui est l'IA)
        const leaderRes = await pool.query(`SELECT * FROM leaderboard WHERE username <> 'Botnaru' LIMIT 1`);
        const top_player = leaderRes.rows[0]
            ? { username: leaderRes.rows[0].username, total_points: Number(leaderRes.rows[0].total_points) }
            : null;

        // 3. Favori IA : score composite = points actuels + proba de victoire futurs × 2
        const teamRes = await pool.query(`
            SELECT
                t.id,
                t.name,
                t.code,
                COALESCE(SUM(
                    CASE
                        WHEN m.status = 'finished' AND m.home_team_id = t.id AND m.home_score > m.away_score THEN 3
                        WHEN m.status = 'finished' AND m.away_team_id = t.id AND m.away_score > m.home_score THEN 3
                        WHEN m.status = 'finished' AND m.home_score = m.away_score THEN 1
                        ELSE 0
                    END
                ), 0) AS current_points,
                COALESCE(SUM(
                    CASE
                        WHEN m.status = 'finished' AND m.home_team_id = t.id THEN m.home_score
                        WHEN m.status = 'finished' AND m.away_team_id = t.id THEN m.away_score
                        ELSE 0
                    END
                ), 0) AS goals_for
            FROM teams t
            LEFT JOIN matches m ON m.home_team_id = t.id OR m.away_team_id = t.id
            GROUP BY t.id, t.name, t.code
        `);

        // Probabilités futures depuis bot_predictions
        const botRes = await pool.query(`
            SELECT m.home_team_id, m.away_team_id, bp.prob_home_win, bp.prob_away_win
            FROM bot_predictions bp
            JOIN matches m ON m.id = bp.match_id
            WHERE m.status = 'scheduled'
        `);

        const futureProb = {};
        botRes.rows.forEach((bp) => {
            futureProb[bp.home_team_id] = (futureProb[bp.home_team_id] || 0) + Number(bp.prob_home_win);
            futureProb[bp.away_team_id] = (futureProb[bp.away_team_id] || 0) + Number(bp.prob_away_win);
        });

        const ranked = teamRes.rows
            .map((t) => ({
                ...t,
                score: Number(t.current_points) * 1.0
                     + Number(t.goals_for) * 0.15
                     + (futureProb[t.id] || 0) * 2.0,
            }))
            .sort((a, b) => b.score - a.score);

        const ai_winner = ranked[0]
            ? { name: ranked[0].name, code: ranked[0].code }
            : null;

        res.json({ remaining_matches, top_player, ai_winner });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
