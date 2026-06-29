const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/bot-predictions
// Retourne les prédictions Botnaru pour tous les matchs à venir
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT bp.match_id,
             ht.name AS home_team,
             at.name AS away_team,
             m.match_datetime,
             m.stage,
             m.group_letter,
             bp.pred_home,
             bp.pred_away,
             bp.prob_home_win,
             bp.prob_draw,
             bp.prob_away_win,
             bp.xg_home,
             bp.xg_away
      FROM bot_predictions bp
      JOIN matches m  ON m.id  = bp.match_id
      JOIN teams   ht ON ht.id = m.home_team_id
      JOIN teams   at ON at.id = m.away_team_id
      WHERE m.status = 'scheduled'
      ORDER BY m.match_datetime ASC
    `);
    res.json({ predictions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
