const pool = require('./db');

// Score exact = 3 pts | bon résultat (vainqueur ou nul) = 1 pt | sinon 0
function computePoints(predHome, predAway, realHome, realAway) {
    if (predHome === realHome && predAway === realAway) return 3;

const predOutcome = Math.sign(predHome - predAway); // 1 = dom, 0 = nul, -1 = ext
    const realOutcome = Math.sign(realHome - realAway);
    if (predOutcome === realOutcome) return 1;

return 0;
}

async function scorePredictions(matchId, realHome, realAway) {
const { rows } = await pool.query(
    'SELECT id, pred_home, pred_away FROM predictions WHERE match_id = $1',
    [matchId]
);

for (const p of rows) {
    const pts = computePoints(p.pred_home, p.pred_away, realHome, realAway);
    await pool.query(
    'UPDATE predictions SET points_awarded = $1 WHERE id = $2',
    [pts, p.id]
    );
}
}

module.exports = { computePoints, scorePredictions };