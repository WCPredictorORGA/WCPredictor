require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();

// CORS — autorise uniquement l'origine du frontend, avec cookies
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Rate limiting — strict sur l'auth, permissif sur le reste
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { error: 'Trop de tentatives, réessayez dans 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200,
    message: { error: 'Trop de requêtes, ralentissez.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const authenticate = require('./middleware/auth');
app.get('/api/me', authenticate, (req, res) => res.json({ user: req.user }));

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/predictions',  require('./routes/predictions'));
app.use('/api/matches',      require('./routes/matches'));
app.use('/api/leaderboard',  require('./routes/leaderboard'));
app.use('/api/stats',        require('./routes/stats'));
app.use('/api/bot-predictions', require('./routes/botpredictions'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
