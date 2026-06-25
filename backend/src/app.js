const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// ── En-têtes de sécurité HTTP ─────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'none'"],       // API JSON : aucune ressource autorisée
            frameAncestors: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// ── CORS strict ───────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',').map(o => o.trim());

app.use(cors({
    origin: (origin, cb) => {
        // origin absent = requête same-origin ou outil (Postman, curl) → autorisé
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(Object.assign(new Error('CORS_BLOCKED'), { status: 403 }));
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Corps et cookies ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));  // rejette les payloads > 10 ko
app.use(cookieParser());

// ── Rate limiting granulaire (désactivé en mode test) ────────────────────────
const IS_TEST = process.env.NODE_ENV === 'test';

if (!IS_TEST) {
    const limiter = (windowMs, max, message, skipSuccess = false) =>
        rateLimit({ windowMs, max, message: { error: message }, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: skipSuccess });

    app.use('/api/auth/login',    limiter(15 * 60 * 1000, 10,  'Trop de tentatives. Réessayez dans 15 minutes.', true));
    app.use('/api/auth/register', limiter(60 * 60 * 1000, 5,   'Trop de créations de compte. Réessayez dans une heure.'));
    app.use('/api/auth',          limiter(15 * 60 * 1000, 20,  'Trop de requêtes. Réessayez dans 15 minutes.'));
    app.use('/api',               limiter(60 * 1000,       200, 'Trop de requêtes. Ralentissez.'));
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const authenticate = require('./middleware/auth');
app.get('/api/me', authenticate, (req, res) => res.json({ user: req.user }));

app.use('/api/auth',            require('./routes/auth'));
app.use('/api/predictions',     require('./routes/predictions'));
app.use('/api/matches',         require('./routes/matches'));
app.use('/api/leaderboard',     require('./routes/leaderboard'));
app.use('/api/stats',           require('./routes/stats'));
app.use('/api/bot-predictions', require('./routes/botpredictions'));
app.use('/api/home-stats',      require('./routes/homestats'));

// ── Gestionnaire d'erreurs global ──────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) console.error(err.stack || err.message);

    if (err.message === 'CORS_BLOCKED' || err.status === 403) {
        return res.status(403).json({ error: 'Origine non autorisée' });
    }
    // Ne jamais exposer les détails internes en production
    res.status(err.status || 500).json({
        error: isProd ? 'Erreur interne du serveur' : (err.message || 'Erreur interne'),
    });
});

module.exports = app;
