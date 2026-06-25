import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { API, authFetch } from '../config.js';

export default function Admin() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

  const [matches, setMatches] = useState([]);
  const [scores, setScores] = useState({});   // { [matchId]: { home: '', away: '' } }
  const [saving, setSaving] = useState({});
  const [flash, setFlash] = useState({});
  const [tab, setTab] = useState('pending'); // 'pending' | 'finished'

  // Rediriger si pas admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, []);

  useEffect(() => {
    fetch(`${API}/api/matches`)
      .then((r) => r.json())
      .then((data) => setMatches(data.matches || []))
      .catch(() => {});
  }, []);

  const handleScore = (matchId, side, value) => {
    setScores((prev) => ({
      ...prev,
      [matchId]: { home: '', away: '', ...prev[matchId], [side]: value },
    }));
  };

  const handleSubmit = async (matchId) => {
    const s = scores[matchId] || {};
    if (s.home === '' || s.away === '') return;
    setSaving((prev) => ({ ...prev, [matchId]: true }));
    try {
      const res = await authFetch(`${API}/api/matches/${matchId}/result`, {
        method: 'POST',
        body: JSON.stringify({ home_score: Number(s.home), away_score: Number(s.away) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      // Mettre à jour le match localement
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? { ...m, status: 'finished', home_score: Number(s.home), away_score: Number(s.away) }
            : m
        )
      );
      showFlash(matchId, 'Résultat enregistré, points calculés !', false);
    } catch (err) {
      showFlash(matchId, err.message, true);
    } finally {
      setSaving((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  const showFlash = (matchId, text, isError) => {
    setFlash((prev) => ({ ...prev, [matchId]: { text, isError } }));
    setTimeout(() => setFlash((prev) => ({ ...prev, [matchId]: null })), 4000);
  };

  const pending = matches.filter((m) => m.status !== 'finished');
  const finished = matches.filter((m) => m.status === 'finished');
  const displayed = tab === 'pending' ? pending : finished;

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-orange-400">Interface Admin</h2>
        <p className="text-slate-400 mt-2">Saisie des résultats et calcul automatique des points</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('pending')}
          className={`px-5 py-2 rounded font-semibold transition ${
            tab === 'pending'
              ? 'bg-orange-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          À saisir ({pending.length})
        </button>
        <button
          onClick={() => setTab('finished')}
          className={`px-5 py-2 rounded font-semibold transition ${
            tab === 'finished'
              ? 'bg-orange-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Terminés ({finished.length})
        </button>
      </div>

      {displayed.length === 0 && (
        <p className="text-slate-500 text-center py-10">
          {tab === 'pending' ? 'Tous les matchs ont un résultat.' : 'Aucun match terminé.'}
        </p>
      )}

      <div className="space-y-3">
        {displayed.map((match) => {
          const s = scores[match.id] || { home: '', away: '' };
          const msg = flash[match.id];

          return (
            <div key={match.id} className="bg-slate-800 rounded-lg p-4 flex flex-wrap sm:flex-nowrap items-center gap-4">
              {/* Équipes */}
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="font-semibold text-white truncate w-32 text-right">
                  {match.home_team}
                </span>
                {match.status === 'finished' ? (
                  <span className="text-xl font-bold text-blue-400 w-16 text-center shrink-0">
                    {match.home_score}–{match.away_score}
                  </span>
                ) : (
                  <span className="text-slate-500 w-16 text-center shrink-0">vs</span>
                )}
                <span className="font-semibold text-white truncate w-32">
                  {match.away_team}
                </span>
              </div>

              {/* Date */}
              <span className="text-slate-500 text-xs hidden md:block w-32 shrink-0 text-right">
                {new Date(match.match_datetime).toLocaleString('fr-FR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
              </span>

              {/* Zone saisie (seulement si pas terminé) */}
              {match.status !== 'finished' ? (
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    placeholder="0"
                    value={s.home}
                    onChange={(e) => handleScore(match.id, 'home', e.target.value)}
                    className="w-12 text-center bg-slate-700 border border-slate-600 rounded p-1 text-white focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-slate-400 font-bold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    placeholder="0"
                    value={s.away}
                    onChange={(e) => handleScore(match.id, 'away', e.target.value)}
                    className="w-12 text-center bg-slate-700 border border-slate-600 rounded p-1 text-white focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={() => handleSubmit(match.id)}
                    disabled={saving[match.id] || s.home === '' || s.away === ''}
                    className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed px-4 py-1 rounded font-bold text-sm transition shrink-0"
                  >
                    {saving[match.id] ? '…' : 'Valider'}
                  </button>
                  {msg && (
                    <span className={`text-xs ${msg.isError ? 'text-red-400' : 'text-green-400'}`}>
                      {msg.text}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-green-500 text-sm font-semibold shrink-0">✓ Scoré</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
