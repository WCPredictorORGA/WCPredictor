const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { rules, handle } = require('../middleware/validate');

const router = express.Router();

const IS_PROD = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: IS_PROD ? 'none' : 'lax',  // 'none' requis pour cross-origin (Vercel → Render)
    secure: IS_PROD,                       // 'none' exige secure:true
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

// INSCRIPTION
router.post('/register', rules.register, handle, async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // 12 rounds : bon équilibre sécurité/perf pour la production
        const password_hash = await bcrypt.hash(password, 12);
        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, username, email, role`,
            [username, email, password_hash]
        );
        res.status(201).json({ user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Email ou pseudo déjà utilisé' });
        }
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// CONNEXION
router.post('/login', rules.login, handle, async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT id, username, email, role, password_hash FROM users WHERE email = $1',
            [email]
        );
        const user = result.rows[0];

        // Même message qu'utilisateur inexistant (évite l'énumération d'emails)
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, COOKIE_OPTIONS);
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DÉCONNEXION
router.post('/logout', (_req, res) => {
    res.clearCookie('token', COOKIE_OPTIONS);
    res.json({ message: 'Déconnecté' });
});

// VÉRIFICATION IDENTITÉ (étape 1 — mot de passe oublié)
router.post('/verify-reset', rules.verifyReset, handle, async (req, res) => {
    const { username, email } = req.body;
    try {
        const result = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND email = $2',
            [username, email]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Aucun compte ne correspond à ces informations' });
        }
        res.json({ verified: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// RÉINITIALISATION MDP (étape 2 — mot de passe oublié)
// Re-vérifie username + email avant de mettre à jour : le frontend ne peut pas sauter l'étape 1.
router.post('/reset-password', rules.resetPassword, handle, async (req, res) => {
    const { username, email, new_password } = req.body;
    try {
        const result = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND email = $2',
            [username, email]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Aucun compte ne correspond à ces informations' });
        }
        // Même librairie (bcryptjs) et même nombre de rounds que /register
        const password_hash = await bcrypt.hash(new_password, 12);
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [password_hash, result.rows[0].id]
        );
        res.json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
