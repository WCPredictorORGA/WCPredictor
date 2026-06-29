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

// GET /api/admin/scrape/status — état du dernier scraping (admin uniquement)
router.get('/scrape/status', authenticate, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }
    res.json(_status);
});

module.exports = router;
