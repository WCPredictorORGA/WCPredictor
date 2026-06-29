/**
 * Service Botnaru — Prédictions basées sur la distribution de Poisson
 *
 * Modèle :
 *  1. Calcule les stats d'attaque/défense de chaque équipe depuis les matchs terminés
 *  2. Dérive les xG (expected goals) home/away
 *  3. Utilise Poisson pour trouver le score exact le plus probable
 *  4. Dérive prob_home_win / prob_draw / prob_away_win
 */

const MAX_GOALS = 7; // plafond pour les calculs Poisson

/** P(X = k) avec paramètre λ (distribution de Poisson) */
function poissonPMF(lambda, k) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/**
 * Calcule les statistiques d'attaque et de défense de chaque équipe
 * depuis les matchs terminés en base de données.
 *
 * @returns {Map<teamId, { name, played, scored, conceded, attackStrength, defenseStrength }>}
 */
async function computeTeamStats(pool) {
  const { rows } = await pool.query(`
    SELECT
      m.home_team_id,
      m.away_team_id,
      ht.name  AS home_name,
      at.name  AS away_name,
      m.home_score,
      m.away_score
    FROM matches m
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    WHERE m.status = 'finished'
      AND m.home_score IS NOT NULL
      AND m.away_score IS NOT NULL
  `);

  if (rows.length === 0) return { stats: new Map(), avgGoals: 1.5 };

  // Aggrégation par équipe
  const byTeam = new Map();
  const ensureTeam = (id, name) => {
    if (!byTeam.has(id)) byTeam.set(id, { name, played: 0, scored: 0, conceded: 0 });
  };

  let totalGoals = 0;
  let totalMatches = 0;

  for (const r of rows) {
    ensureTeam(r.home_team_id, r.home_name);
    ensureTeam(r.away_team_id, r.away_name);

    byTeam.get(r.home_team_id).played++;
    byTeam.get(r.home_team_id).scored   += r.home_score;
    byTeam.get(r.home_team_id).conceded += r.away_score;

    byTeam.get(r.away_team_id).played++;
    byTeam.get(r.away_team_id).scored   += r.away_score;
    byTeam.get(r.away_team_id).conceded += r.home_score;

    totalGoals   += r.home_score + r.away_score;
    totalMatches += 1;
  }

  // Moyenne buts/match du tournoi (référence Poisson)
  const avgGoals = totalGoals / totalMatches;

  // Calcul des coefficients d'attaque et défense
  for (const [, team] of byTeam) {
    const avgScored   = team.scored   / team.played;
    const avgConceded = team.conceded / team.played;
    team.attackStrength  = avgScored   / avgGoals;
    team.defenseStrength = avgConceded / avgGoals;
  }

  return { stats: byTeam, avgGoals };
}

/**
 * Recherche une équipe par nom dans la Map des stats.
 * Retourne null si introuvable.
 */
function findTeamByName(stats, name) {
  for (const [id, t] of stats) {
    if (t.name === name) return { id, ...t };
  }
  return null;
}

/** Fallback Elo simplifié quand une équipe n'a pas de matchs en base */
const ELO_FALLBACK = {
  'Brésil': 1800, 'France': 1780, 'Angleterre': 1750, 'Allemagne': 1720,
  'Espagne': 1700, 'Argentine': 1760, 'Portugal': 1690, 'Pays-Bas': 1660,
  'Belgique': 1640, 'Italie': 1620, 'USA': 1560, 'Mexique': 1540,
  'Maroc': 1520, 'Japon': 1510, 'Sénégal': 1500, 'Australie': 1490,
  'Croatie': 1530, 'Suisse': 1520, 'Uruguay': 1540, 'Colombie': 1530,
  'Norvège': 1560, 'Suède': 1510, 'Danemark': 1530, 'Pologne': 1490,
  'Paraguay': 1420, "Côte d'Ivoire": 1510,
};
const DEFAULT_ELO = 1450;

function eloFallbackXG(homeName, awayName, avgGoals) {
  const hr = ELO_FALLBACK[homeName] || DEFAULT_ELO;
  const ar = ELO_FALLBACK[awayName] || DEFAULT_ELO;
  const diff = hr + 30 - ar;
  const pHome = 1 / (1 + Math.pow(10, -diff / 400));
  // Dérive xG à partir de la proba Elo : xg_home + xg_away ≈ 2 × avgGoals
  const xgHome = pHome * 2 * avgGoals;
  const xgAway = (1 - pHome) * 2 * avgGoals;
  return { xgHome: Math.max(0.3, xgHome), xgAway: Math.max(0.3, xgAway) };
}

/**
 * Prédit un match avec le modèle Poisson.
 *
 * @returns {{ pred_home, pred_away, prob_home_win, prob_draw, prob_away_win, xg_home, xg_away }}
 */
function predictMatch(homeName, awayName, stats, avgGoals) {
  const home = findTeamByName(stats, homeName);
  const away = findTeamByName(stats, awayName);

  let xgHome, xgAway;

  if (home && away) {
    // Modèle Poisson complet
    xgHome = home.attackStrength * away.defenseStrength * avgGoals;
    xgAway = away.attackStrength * home.defenseStrength * avgGoals;
  } else if (home && !away) {
    const fb = eloFallbackXG(homeName, awayName, avgGoals);
    xgHome = (home.attackStrength * avgGoals + fb.xgHome) / 2;
    xgAway = fb.xgAway;
  } else if (!home && away) {
    const fb = eloFallbackXG(homeName, awayName, avgGoals);
    xgHome = fb.xgHome;
    xgAway = (away.attackStrength * avgGoals + fb.xgAway) / 2;
  } else {
    // Aucune donnée — fallback Elo pur
    const fb = eloFallbackXG(homeName, awayName, avgGoals);
    xgHome = fb.xgHome;
    xgAway = fb.xgAway;
  }

  // Clamp pour éviter des cas extrêmes
  xgHome = Math.min(Math.max(xgHome, 0.2), 5.0);
  xgAway = Math.min(Math.max(xgAway, 0.2), 5.0);

  // Matrice de probabilités Poisson
  let probHomeWin = 0, probDraw = 0, probAwayWin = 0;
  let bestProb = -1, predHome = 1, predAway = 1;

  for (let i = 0; i <= MAX_GOALS; i++) {
    const pi = poissonPMF(xgHome, i);
    for (let j = 0; j <= MAX_GOALS; j++) {
      const pj  = poissonPMF(xgAway, j);
      const pij = pi * pj;

      if (i > j)      probHomeWin += pij;
      else if (i < j) probAwayWin += pij;
      else            probDraw    += pij;

      if (pij > bestProb) {
        bestProb  = pij;
        predHome  = i;
        predAway  = j;
      }
    }
  }

  // Normaliser (somme peut légèrement dévier de 1 à cause du plafond MAX_GOALS)
  const total = probHomeWin + probDraw + probAwayWin;
  probHomeWin /= total;
  probDraw    /= total;
  probAwayWin /= total;

  return {
    pred_home:     predHome,
    pred_away:     predAway,
    prob_home_win: Math.round(probHomeWin * 10000) / 10000,
    prob_draw:     Math.round(probDraw    * 10000) / 10000,
    prob_away_win: Math.round(probAwayWin * 10000) / 10000,
    xg_home:       Math.round(xgHome * 100) / 100,
    xg_away:       Math.round(xgAway * 100) / 100,
  };
}

/**
 * Génère et sauvegarde les prédictions Botnaru pour tous les matchs
 * scheduled sans prédiction existante.
 *
 * @param {Pool} pool — pool PostgreSQL
 * @param {{ upsert?: boolean }} opts — si upsert=true, écrase les prédictions existantes
 * @returns {Array} liste des prédictions insérées
 */
async function generateAllPredictions(pool, opts = {}) {
  const { stats, avgGoals } = await computeTeamStats(pool);

  const whereClause = opts.upsert
    ? ''
    : `AND NOT EXISTS (SELECT 1 FROM bot_predictions bp WHERE bp.match_id = m.id)`;

  const { rows: matches } = await pool.query(`
    SELECT m.id, ht.name AS home_team, at.name AS away_team, m.stage
    FROM matches m
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    WHERE m.status = 'scheduled'
    ${whereClause}
    ORDER BY m.match_datetime ASC
  `);

  if (matches.length === 0) return [];

  const inserted = [];
  for (const m of matches) {
    const pred = predictMatch(m.home_team, m.away_team, stats, avgGoals);

    await pool.query(`
      INSERT INTO bot_predictions
        (match_id, pred_home, pred_away, prob_home_win, prob_draw, prob_away_win, xg_home, xg_away)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (match_id) DO UPDATE SET
        pred_home     = EXCLUDED.pred_home,
        pred_away     = EXCLUDED.pred_away,
        prob_home_win = EXCLUDED.prob_home_win,
        prob_draw     = EXCLUDED.prob_draw,
        prob_away_win = EXCLUDED.prob_away_win,
        xg_home       = EXCLUDED.xg_home,
        xg_away       = EXCLUDED.xg_away
    `, [m.id, pred.pred_home, pred.pred_away,
        pred.prob_home_win, pred.prob_draw, pred.prob_away_win,
        pred.xg_home, pred.xg_away]);

    inserted.push({
      match:    `${m.home_team} vs ${m.away_team}`,
      score:    `${pred.pred_home}-${pred.pred_away}`,
      xg:       `${pred.xg_home} – ${pred.xg_away}`,
      probs:    `${Math.round(pred.prob_home_win*100)}% / ${Math.round(pred.prob_draw*100)}% / ${Math.round(pred.prob_away_win*100)}%`,
      method:   stats.size > 0 ? 'Poisson' : 'Elo-fallback',
    });
  }

  return inserted;
}

module.exports = { generateAllPredictions, predictMatch, computeTeamStats, poissonPMF };
