const express = require('express');
const authenticate = require('../middleware/auth');

const router = express.Router();

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://scraper:5001';

// POST /api/admin/scrape — déclenche un import (admin uniquement)
router.post('/scrape', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }
    try {
        const response = await fetch(`${SCRAPER_URL}/scrape`, {
            method: 'POST',
            signal: AbortSignal.timeout(10_000),
        });
        const data = await response.json();
        if (!response.ok) {
            return res.status(502).json({ error: data.error || 'Erreur scraper' });
        }
        res.status(202).json(data);
    } catch (err) {
        console.error('Scraper trigger error:', err.message);
        res.status(503).json({ error: 'Service de scraping indisponible' });
    }
});

// GET /api/admin/scrape/status — état du dernier scraping (admin uniquement)
router.get('/scrape/status', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }
    try {
        const response = await fetch(`${SCRAPER_URL}/status`, {
            signal: AbortSignal.timeout(5_000),
        });
        const data = await response.json();
        res.json(data);
    } catch {
        res.status(503).json({ error: 'Service de scraping indisponible' });
    }
});

module.exports = router;
