/**
 * Script CLI — Génère les prédictions Botnaru via le modèle Poisson.
 *
 * Usage :
 *   DATABASE_URL=... node scripts/generate_bot_predictions.js
 *   DATABASE_URL=... node scripts/generate_bot_predictions.js --upsert
 *
 * --upsert : écrase les prédictions existantes (recalcul complet)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const { generateAllPredictions, computeTeamStats } = require('../src/services/botnaru');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const upsert = process.argv.includes('--upsert');

async function run() {
  try {
    // Affiche les stats disponibles
    const { stats, avgGoals } = await computeTeamStats(pool);
    console.log(`\n📊 Données disponibles : ${stats.size} équipes, moyenne ${avgGoals.toFixed(2)} buts/match\n`);

    if (stats.size === 0) {
      console.log('⚠️  Aucun match terminé — utilisation du fallback Elo.\n');
    }

    const inserted = await generateAllPredictions(pool, { upsert });

    if (inserted.length === 0) {
      console.log('✅ Tous les matchs scheduled ont déjà une prédiction.');
      return;
    }

    console.log(`📋 ${inserted.length} prédiction(s) générée(s) :\n`);
    for (const p of inserted) {
      console.log(
        `  ✔ ${p.match.padEnd(35)} → ${p.score.padEnd(5)}` +
        `  xG [${p.xg}]  (${p.probs})  [${p.method}]`
      );
    }
    console.log('\n✅ Terminé.');
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
