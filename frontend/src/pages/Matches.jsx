import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { API, authFetch } from '../config.js';

const STAGE_LABEL = {
  group: 'Phase de groupes',
  round32: 'Seizièmes de finale',
  round16: 'Huitièmes de finale',
  quarter: 'Quarts de finale',
  semi: 'Demi-finales',
  final: 'Finale',
};

const STAGE_ORDER = ['group', 'round32', 'round16', 'quarter', 'semi', 'final'];

const STATUS_BADGE = {
  scheduled: 'bg-blue-700 text-blue-100',
  live: 'bg-green-500 text-white',
  finished: 'bg-slate-600 text-slate-300',
};

const STATUS_LABEL = {
  scheduled: 'À venir',
  live: 'En cours',
  finished: 'Terminé',
};

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [botPredictions, setBotPredictions] = useState({});
  const [inputs, setInputs] = useState({});
  const [saving, setSaving] = useState({});
  const [flash, setFlash] = useState({});
  const { state } = useLocation();
  const [groupFilter, setGroupFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(state?.statusFilter ?? 'all');

  useEffect(() => {
    loadMatches();
    loadPredictions();
    loadBotPredictions();
  }, []);

  const loadMatches = async () => {
    try {
      const res = await fetch(`${API}/api/matches`);
      const data = await res.json();
      setMatches(data.matches || []);
    } catch {
      // réseau indisponible
    }
  };

  const loadBotPredictions = async () => {
    try {
      const res = await fetch(`${API}/api/bot-predictions`);
      const data = await res.json();
      const map = {};
      (data.predictions || []).forEach((p) => { map[p.match_id] = p; });
      setBotPredictions(map);
    } catch {
      // service IA pas encore lancé
    }
  };

  const loadPredictions = async () => {
    try {
      const res = await authFetch(`${API}/api/predictions`);
      const data = await res.json();
      const predMap = {};
      const inputMap = {};
      (data.predictions || []).forEach((p) => {
        predMap[p.match_id] = p;
        inputMap[p.match_id] = { home: String(p.pred_home), away: String(p.pred_away) };
      });
      setPredictions(predMap);
      setInputs(inputMap);
    } catch {
      // réseau indisponible
    }
  };

  const handleInput = (matchId, side, value) => {
    setInputs((prev) => ({
      ...prev,
      [matchId]: {
        home: prev[matchId]?.home ?? '',
        away: prev[matchId]?.away ?? '',
        ...prev[matchId],
        [side]: value,
      },
    }));
  };

  const handleSave = async (matchId) => {
    const inp = inputs[matchId] || {};
    if (inp.home === '' || inp.away === '') return;
    setSaving((prev) => ({ ...prev, [matchId]: true }));
    try {
      const res = await authFetch(`${API}/api/predictions`, {
        method: 'POST',
        body: JSON.stringify({
          match_id: matchId,
          pred_home: Number(inp.home),
          pred_away: Number(inp.away),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setPredictions((prev) => ({ ...prev, [matchId]: { ...prev[matchId], ...data.prediction } }));
      showFlash(matchId, 'Pronostic enregistré !', false);
    } catch (err) {
      showFlash(matchId, err.message, true);
    } finally {
      setSaving((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  const showFlash = (matchId, text, isError) => {
    setFlash((prev) => ({ ...prev, [matchId]: { text, isError } }));
    setTimeout(() => setFlash((prev) => ({ ...prev, [matchId]: null })), 3000);
  };

  const pointsBadge = (pts) => {
    if (pts === 3) return 'bg-yellow-600 text-yellow-100';
    if (pts === 1) return 'bg-green-700 text-green-100';
    if (pts === 0) return 'bg-red-800 text-red-200';
    return 'bg-slate-700 text-slate-300';
  };

  const groups = [...new Set(matches.map((m) => m.group_letter).filter(Boolean))].sort();

  const visibleMatches = matches.filter((m) => {
    if (groupFilter && m.group_letter !== groupFilter) return false;
    if (statusFilter === 'scheduled' && m.status !== 'scheduled') return false;
    if (statusFilter === 'finished' && m.status !== 'finished') return false;
    return true;
  });

  const grouped = visibleMatches.reduce((acc, m) => {
    if (!acc[m.stage]) acc[m.stage] = [];
    acc[m.stage].push(m);
    return acc;
  }, {});

  const btnGroup = (val, label) => (
    <button
      key={val}
      onClick={() => setGroupFilter(val === groupFilter ? null : val)}
      className={`px-3 py-1 rounded text-sm font-semibold transition ${
        groupFilter === val
          ? 'bg-blue-600 text-white'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      {label}
    </button>
  );

  const btnStatus = (val, label) => (
    <button
      key={val}
      onClick={() => setStatusFilter(val)}
      className={`px-4 py-1.5 rounded text-sm font-semibold transition ${
        statusFilter === val
          ? 'bg-slate-200 text-slate-900'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-blue-400">Matchs &amp; Pronostics</h2>
        <p className="text-slate-400 mt-2">Entrez vos scores prédits avant le coup d'envoi.</p>
      </div>

      {/* Filtres */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6 space-y-3">
        {/* Filtre statut */}
        <div className="flex gap-2 flex-wrap">
          {btnStatus('all', 'Tous')}
          {btnStatus('scheduled', 'À venir')}
          {btnStatus('finished', 'Terminés')}
        </div>
        {/* Filtre groupe */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-slate-400 text-xs mr-1">Groupe :</span>
          {btnGroup(null, 'Tous')}
          {groups.map((g) => btnGroup(g, g))}
        </div>
      </div>

      {STAGE_ORDER.filter((s) => grouped[s]).map((stage) => (
        <div key={stage} className="mb-8">
          <h3 className="text-base font-semibold text-slate-300 mb-3 border-b border-slate-700 pb-2 uppercase tracking-wider">
            {STAGE_LABEL[stage] || stage}
          </h3>

          <div className="space-y-3">
            {grouped[stage].map((match) => {
              const pred = predictions[match.id];
              const bot  = botPredictions[match.id];
              const inp = inputs[match.id] || { home: '', away: '' };
              const msg = flash[match.id];
              const isScheduled = match.status === 'scheduled';

              return (
                <div key={match.id} className="bg-slate-800 rounded-lg overflow-hidden">
                <div
                  className="p-4 flex flex-wrap sm:flex-nowrap items-center gap-3"
                >
                  {/* Badge statut */}
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 w-20 text-center ${STATUS_BADGE[match.status]}`}
                  >
                    {STATUS_LABEL[match.status]}
                  </span>

                  {/* Équipes + score officiel */}
                  <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
                    <span className="font-semibold text-white text-right truncate w-28">
                      {match.home_team}
                    </span>

                    {match.status === 'finished' ? (
                      <span className="text-xl font-bold text-blue-400 shrink-0 w-14 text-center">
                        {match.home_score}–{match.away_score}
                      </span>
                    ) : (
                      <span className="text-slate-500 shrink-0 w-14 text-center">vs</span>
                    )}

                    <span className="font-semibold text-white text-left truncate w-28">
                      {match.away_team}
                    </span>
                  </div>

                  {/* Date */}
                  <span className="text-slate-500 text-xs shrink-0 hidden lg:block w-32 text-right">
                    {new Date(match.match_datetime).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {/* Zone pronostic */}
                  {isScheduled ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        className="w-11 text-center bg-slate-700 border border-slate-600 rounded p-1 text-white focus:outline-none focus:border-blue-500"
                        value={inp.home}
                        onChange={(e) => handleInput(match.id, 'home', e.target.value)}
                        placeholder="–"
                      />
                      <span className="text-slate-400 font-bold">:</span>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        className="w-11 text-center bg-slate-700 border border-slate-600 rounded p-1 text-white focus:outline-none focus:border-blue-500"
                        value={inp.away}
                        onChange={(e) => handleInput(match.id, 'away', e.target.value)}
                        placeholder="–"
                      />
                      <button
                        onClick={() => handleSave(match.id)}
                        disabled={saving[match.id] || inp.home === '' || inp.away === ''}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed px-3 py-1 rounded text-sm font-bold transition shrink-0"
                      >
                        {saving[match.id] ? '…' : pred ? '✓ Modifier' : 'Valider'}
                      </button>
                      {msg && (
                        <span className={`text-xs shrink-0 ${msg.isError ? 'text-red-400' : 'text-green-400'}`}>
                          {msg.text}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="shrink-0 w-44 text-center">
                      {pred ? (
                        <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${pointsBadge(pred.points_awarded)}`}>
                          {pred.pred_home}–{pred.pred_away}
                          {pred.points_awarded != null && (
                            <span className="ml-2 font-bold">
                              {pred.points_awarded} pt{pred.points_awarded !== 1 ? 's' : ''}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Non pronostiqué</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Prédiction du bot (bandeau sous la ligne) */}
                {bot && isScheduled && (
                  <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-700 flex items-center gap-3 text-xs text-slate-400">
                    <span className="font-semibold text-purple-400">🤖 Bot IA</span>
                    <span className="font-bold text-white">{bot.pred_home}–{bot.pred_away}</span>
                    <span className="ml-2">
                      Dom. <span className="text-green-400">{Math.round(bot.prob_home_win * 100)}%</span>
                      {' · '}Nul <span className="text-slate-300">{Math.round(bot.prob_draw * 100)}%</span>
                      {' · '}Ext. <span className="text-red-400">{Math.round(bot.prob_away_win * 100)}%</span>
                    </span>
                  </div>
                )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {visibleMatches.length === 0 && (
        <p className="text-center text-slate-400 mt-20">
          {matches.length === 0 ? 'Aucun match disponible.' : 'Aucun match pour ces filtres.'}
        </p>
      )}
    </div>
  );
}
