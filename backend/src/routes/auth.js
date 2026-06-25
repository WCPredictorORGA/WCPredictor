const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();       // un mini-serveur dédié aux routes d'auth

// INSCRIPTION
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
    return res.status(400).json({ error: 'Champs manquants' });
    }

    try {
    const password_hash = await bcrypt.hash(password, 10);   // hachage

    const result = await pool.query(
        `INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, username, email, role`,
        [username, email, password_hash]
    );

    res.status(201).json({ user: result.rows[0] });
    } catch (err) {
    if (err.code === '23505') {                              // doublon
        return res.status(409).json({ error: 'Email ou pseudo déjà utilisé' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
    }
});

// CONNEXION
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
        [email]
    );
    const user = result.rows[0];

    if (!user) {
        return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
        token,
        user: { id: user.id, username: user.username, role: user.role }
    });
    } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;