const express = require('express');
const authenticate = require('../middleware/auth');
const { runScrape } = require('../scraper');
const pool = require('../db');
const { generateAllPredictions } = require('../services/botnaru');

const router = express.Router();

// État en mémoire du scraping en cours
let _status = { running: false, last: null };

function triggerScrape() {
    if (_status.running) return false;
    _status.running = true;

    runScrape()
        .then((stats) => {
            _status.last = { success: true, trigger: 'manuel', at: new Date().toISOString(), stats };
        })
        .catch((err) => {
            console.error('Scraping échoué :', err.message);
            _status.last = { success: false, trigger: 'manuel', error: err.message, at: new Date().toISOString() };
        })
        .finally(() => { _status.running = false; });

    return true;
}

// POST /api/admin/scrape — déclenche un import (admin uniquement)
router.post('/scrape', authenticate, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }
    if (!triggerScrape()) {
        return res.status(409).json({ error: 'Scraping déjà en cours' });
    }
    res.status(202).json({ message: 'Scraping démarré' });
});

// POST /api/admin/generate-bot-predictions — génère/régénère avec Poisson
// ?upsert=true pour écraser les prédictions existantes
router.post('/generate-bot-predictions', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }
    try {
        const upsert = req.query.upsert === 'true';
        const inserted = await generateAllPredictions(pool, { upsert });

        if (inserted.length === 0) {
            return res.json({ message: 'Tous les matchs scheduled ont déjà une prédiction.', inserted: [] });
        }
        res.json({ message: `${inserted.length} prédiction(s) générée(s) via Poisson.`, inserted });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/seed-botnaru-prediction
// Insère un pronostic "score exact" (3 pts) pour Botnaru sur le premier match terminé
router.post('/seed-botnaru-prediction', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }
    try {
        const result = await pool.query(`
            INSERT INTO predictions (user_id, match_id, pred_home, pred_away, points_awarded)
            SELECT
                u.id,
                m.id,
                m.home_score,
                m.away_score,
                3
            FROM users u
            CROSS JOIN (
                SELECT m.id, m.home_score, m.away_score,
                       ht.name AS home_team, at.name AS away_team
                FROM matches m
                JOIN teams ht ON ht.id = m.home_team_id
                JOIN teams at ON at.id = m.away_team_id
                WHERE m.status = 'finished'
                  AND m.home_score IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM predictions p
                      JOIN users bot ON bot.id = p.user_id AND bot.username = 'Botnaru'
                      WHERE p.match_id = m.id
                  )
                ORDER BY m.match_datetime ASC
                LIMIT 1
            ) m
            WHERE u.username = 'Botnaru'
            ON CONFLICT (user_id, match_id) DO UPDATE
                SET pred_home = EXCLUDED.pred_home,
                    pred_away = EXCLUDED.pred_away,
                    points_awarded = 3
            RETURNING match_id, pred_home, pred_away, points_awarded
        `);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Aucun match terminé sans prédiction Botnaru trouvé.' });
        }

        const row = result.rows[0];
        res.json({
            message: `Score exact inséré : ${row.pred_home}–${row.pred_away} (match_id ${row.match_id}) — ${row.points_awarded} pts`,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/scrape/status — état du dernier scraping (admin uniquement)
router.get('/scrape/status', authenticate, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }
    res.json(_status);
});

module.exports = router;
