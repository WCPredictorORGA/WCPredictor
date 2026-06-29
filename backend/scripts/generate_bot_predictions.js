/**
 * Génère des prédictions Botnaru pour les matchs `scheduled` sans prédiction.
 *
 * Usage : DATABASE_URL=... node scripts/generate_bot_predictions.js
 *
 * Logique : probabilités basées sur des cotes FIFA générales (modifiables).
 * Chaque équipe a un "rating" relatif → prob_home_win / draw / prob_away_win.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Ratings relatifs (plus le chiffre est élevé, plus l'équipe est forte) ──
// Ajoute ici toutes les équipes encore en lice. Valeur neutre = 1000.
const RATINGS = {
  'Brésil':         1800,
  'France':         1780,
  'Angleterre':     1750,
  'Allemagne':      1720,
  'Espagne':        1700,
  'Argentine':      1760,
  'Portugal':       1690,
  'Pays-Bas':       1660,
  'Belgique':       1640,
  'Italie':         1620,
  'USA':            1560,
  'Mexique':        1540,
  'Maroc':          1520,
  'Japon':          1510,
  'Sénégal':        1500,
  'Australie':      1490,
  'Croatie':        1530,
  'Suisse':         1520,
  'Uruguay':        1540,
  'Colombie':       1530,
  'Norvège':        1560,
  'Suède':          1510,
  'Danemark':       1530,
  'Pologne':        1490,
  'Paraguay':       1420,
  "Côte d'Ivoire":  1510,
  'Cameroun':       1430,
  'Équateur':       1460,
  'Chili':          1480,
  'Iran':           1420,
  'Tunisie':        1410,
  'Ghana':          1420,
  'Serbie':         1490,
  'Tchéquie':       1470,
  'Autriche':       1480,
  'Turquie':        1490,
  'Slovaquie':      1440,
  'Albanie':        1390,
  'Géorgie':        1370,
  'Roumanie':       1430,
  'Hongrie':        1410,
  'Écosse':         1430,
  'Slovénie':       1400,
  'Pérou':          1440,
  'Venezuela':      1390,
  'Bolivie':        1360,
  'Chine':          1350,
  'Corée du Sud':   1480,
  'Qatar':          1380,
  'Arabie Saoudite':1400,
  'Irak':           1370,
  'Jordanie':       1350,
  'Costa Rica':     1440,
  'Honduras':       1390,
  'Canada':         1480,
  'Jamaïque':       1370,
  'Haïti':          1340,
  'Panama':         1420,
};
const DEFAULT_RATING = 1450;

/**
 * Estime les probabilités via la formule Elo simplifiée.
 * draw_boost = tendance aux nuls dans les tournois à élimination directe.
 */
function estimateProbs(homeRating, awayRating) {
  const HOME_ADV    = 30;  // petit avantage domicile symbolique (terrain neutre → 0)
  const DRAW_FACTOR = 0.22; // proportion de nuls typique en élim. directe

  const diff = (homeRating + HOME_ADV) - awayRating;
  // Probabilité de victoire home avant prise en compte des nuls
  const pHomeWin = 1 / (1 + Math.pow(10, -diff / 400));
  const pAwayWin = 1 - pHomeWin;

  // Répartition avec nuls
  const draw      = DRAW_FACTOR;
  const pHome     = pHomeWin * (1 - draw);
  const pAway     = pAwayWin * (1 - draw);

  return {
    prob_home_win: Math.round(pHome * 10000) / 10000,
    prob_draw:     Math.round(draw  * 10000) / 10000,
    prob_away_win: Math.round(pAway * 10000) / 10000,
  };
}

/**
 * Score Botnaru : le bot mise sur le favori (si prob > 60%) ou le nul sinon.
 */
function predictScore(probs) {
  if (probs.prob_home_win > 0.55) return { pred_home: 2, pred_away: 0 };
  if (probs.prob_away_win > 0.55) return { pred_home: 0, pred_away: 2 };
  return { pred_home: 1, pred_away: 1 }; // favori: nul
}

async function run() {
  try {
    // Matchs scheduled sans prédiction bot
    const { rows: matches } = await pool.query(`
      SELECT m.id, ht.name AS home_team, at.name AS away_team,
             m.match_datetime, m.stage
      FROM matches m
      JOIN teams ht ON ht.id = m.home_team_id
      JOIN teams at ON at.id = m.away_team_id
      WHERE m.status = 'scheduled'
        AND NOT EXISTS (
          SELECT 1 FROM bot_predictions bp WHERE bp.match_id = m.id
        )
      ORDER BY m.match_datetime ASC
    `);

    if (matches.length === 0) {
      console.log('✅ Tous les matchs scheduled ont déjà une prédiction Botnaru.');
      return;
    }

    console.log(`\n📋 ${matches.length} match(s) sans prédiction :\n`);

    for (const m of matches) {
      const hr = RATINGS[m.home_team] || DEFAULT_RATING;
      const ar = RATINGS[m.away_team] || DEFAULT_RATING;
      const probs = estimateProbs(hr, ar);
      const score = predictScore(probs);

      await pool.query(`
        INSERT INTO bot_predictions
          (match_id, pred_home, pred_away, prob_home_win, prob_draw, prob_away_win)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (match_id) DO NOTHING
      `, [m.id, score.pred_home, score.pred_away,
          probs.prob_home_win, probs.prob_draw, probs.prob_away_win]);

      console.log(
        `  ✔ ${m.home_team.padEnd(20)} vs ${m.away_team.padEnd(20)}` +
        `  → ${score.pred_home}-${score.pred_away}` +
        `  (${Math.round(probs.prob_home_win*100)}% / ${Math.round(probs.prob_draw*100)}% / ${Math.round(probs.prob_away_win*100)}%)`
      );
    }

    console.log('\n✅ Prédictions insérées avec succès.');
  } catch (err) {
    console.error('❌ Erreur :', err.message);
  } finally {
    await pool.end();
  }
}

run();
