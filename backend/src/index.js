require('dotenv').config();

// Validation des variables critiques au démarrage
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET doit faire au moins 32 caractères.');
    process.exit(1);
}
if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL manquant.');
    process.exit(1);
}

const app = require('./app');
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
