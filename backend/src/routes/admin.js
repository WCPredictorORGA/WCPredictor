const express = require('express');
const bcrypt = require('bcryptjs');
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

// POST /api/admin/set-role — change le rôle d'un utilisateur (admin uniquement)
router.post('/set-role', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }
    const { username, role } = req.body;
    if (!username || !['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'username et role (admin|user) requis' });
    }
    try {
        const result = await pool.query(
            `UPDATE users SET role = $1 WHERE username = $2 RETURNING id, username, role`,
            [role, username]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: `Utilisateur "${username}" introuvable` });
        }
        res.json({ message: `✓ ${result.rows[0].username} est maintenant ${role}`, user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/users — liste tous les comptes (hors Botnaru)
router.get('/users', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }
    try {
        const result = await pool.query(
            `SELECT id, username, email, role, created_at
             FROM users
             WHERE username != 'Botnaru'
             ORDER BY created_at ASC`
        );
        res.json({ users: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/admin/users/:id — modifie username, email et/ou mot de passe
router.put('/users/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) return res.status(400).json({ error: 'ID invalide' });

    const { username, email, password } = req.body;
    if (!username && !email && !password) {
        return res.status(400).json({ error: 'Aucune modification fournie' });
    }

    try {
        const check = await pool.query('SELECT username FROM users WHERE id = $1', [targetId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
        if (check.rows[0].username === 'Botnaru') {
            return res.status(403).json({ error: 'Le compte Botnaru ne peut pas être modifié' });
        }

        const cols = [];
        const vals = [];
        let i = 1;

        if (username) { cols.push(`username = $${i++}`); vals.push(username.trim()); }
        if (email)    { cols.push(`email = $${i++}`);    vals.push(email.trim().toLowerCase()); }
        if (password) {
            if (password.length < 8) return res.status(400).json({ error: 'Mot de passe trop court (8 caractères min.)' });
            const hash = await bcrypt.hash(password, 12);
            cols.push(`password_hash = $${i++}`);
            vals.push(hash);
        }

        vals.push(targetId);
        const result = await pool.query(
            `UPDATE users SET ${cols.join(', ')} WHERE id = $${i} RETURNING id, username, email, role`,
            vals
        );
        res.json({ message: '✓ Compte mis à jour', user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: "Ce nom d'utilisateur ou email est déjà utilisé" });
        }
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/admin/users/:id — supprime un compte
router.delete('/users/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) return res.status(400).json({ error: 'ID invalide' });
    if (targetId === req.user.id) {
        return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    try {
        const check = await pool.query('SELECT username FROM users WHERE id = $1', [targetId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
        if (check.rows[0].username === 'Botnaru') {
            return res.status(403).json({ error: 'Le compte Botnaru ne peut pas être supprimé' });
        }

        await pool.query('DELETE FROM users WHERE id = $1', [targetId]);
        res.json({ message: '✓ Compte supprimé' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/predictions — insère ou écrase un pronostic pour n'importe quel joueur sur un match terminé
router.post('/predictions', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Réservé aux administrateurs' });
    }

    const uid = parseInt(req.body.user_id,  10);
    const mid = parseInt(req.body.match_id, 10);
    const ph  = parseInt(req.body.pred_home, 10);
    const pa  = parseInt(req.body.pred_away, 10);

    if ([uid, mid, ph, pa].some(isNaN) || ph < 0 || pa < 0 || ph > 99 || pa > 99) {
        return res.status(400).json({ error: 'Paramètres invalides' });
    }

    try {
        const matchRes = await pool.query(
            'SELECT status, home_score, away_score FROM matches WHERE id = $1',
            [mid]
        );
        if (matchRes.rows.length === 0) return res.status(404).json({ error: 'Match introuvable' });

        const { status, home_score, away_score } = matchRes.rows[0];
        if (status !== 'finished' || home_score === null) {
            return res.status(400).json({ error: "Ce match n'a pas encore de résultat officiel" });
        }

        const { computePoints } = require('../scoring');
        const points = computePoints(ph, pa, home_score, away_score);

        const result = await pool.query(
            `INSERT INTO predictions (user_id, match_id, pred_home, pred_away, points_awarded)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, match_id) DO UPDATE
               SET pred_home      = EXCLUDED.pred_home,
                   pred_away      = EXCLUDED.pred_away,
                   points_awarded = EXCLUDED.points_awarded
             RETURNING id, pred_home, pred_away, points_awarded`,
            [uid, mid, ph, pa, points]
        );

        res.json({
            message: `✓ Pronostic inséré — ${points} pt${points !== 1 ? 's' : ''}`,
            prediction: result.rows[0],
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
