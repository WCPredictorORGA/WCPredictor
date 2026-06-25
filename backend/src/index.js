require('dotenv').config();            // charge le .env en tout premier
const express = require('express');
const cors = require('cors');

const app = express();                 // crée l'application serveur

app.use(cors());                       // autorise les appels du frontend
app.use(express.json());               // sait lire le JSON envoyé par le client

// Une route de test : répond quand on visite /health
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

//test
const authenticate = require('./middleware/auth');
app.get('/api/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/bot-predictions', require('./routes/botpredictions'));

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});