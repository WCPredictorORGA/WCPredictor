import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, authFetch } from '../config.js';

export default function Admin() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

  const [matches, setMatches] = useState([]);
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState({});
  const [flash, setFlash] = useState({});
  const [tab, setTab] = useState('pending');

  const [scrapeRunning, setScrapeRunning] = useState(false);
  const [scrapeFlash, setScrapeFlash] = useState(null);
  const [scrapeLast, setScrapeLast] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/');
  }, []);

  useEffect(() => {
    fetch(`${API}/api/matches`)
      .then((r) => r.json())
      .then((d) => setMatches(d.matches || []))
      .catch(() => {});
  }, []);

  // Récupère le statut du scraper au montage
  useEffect(() => {
    authFetch(`${API}/api/admin/scrape/status`)
      .then((r) => r.json())
      .then((d) => {
        setScrapeLast(d.last || null);
        if (d.running) {
          setScrapeRunning(true);
          pollRef.current = setTimeout(pollScrapeStatus, 2000);
        }
      })
      .catch(() => {});
    return () => clearTimeout(pollRef.current);
  }, []);

  const pollScrapeStatus = async () => {
    try {
      const r = await authFetch(`${API}/api/admin/scrape/status`);
      const d = await r.json();
      setScrapeLast(d.last || null);
      if (d.running) {
        pollRef.current = setTimeout(pollScrapeStatus, 2000);
      } else {
        setScrapeRunning(false);
        if (d.last?.success) {
          setScrapeFlash({ text: '✓ Import terminé avec succès', isError: false });
          fetch(`${API}/api/matches`).then((r2) => r2.json()).then((d2) => setMatches(d2.matches || []));
        } else if (d.last?.success === false) {
          setScrapeFlash({ text: `Erreur : ${d.last.error}`, isError: true });
        }
        setTimeout(() => setScrapeFlash(null), 6000);
      }
    } catch {
      setScrapeRunning(false);
      setScrapeFlash({ text: 'Service de scraping indisponible', isError: true });
      setTimeout(() => setScrapeFlash(null), 6000);
    }
  };

  const handleScrape = async () => {
    if (!window.confirm(
      'Lancer l\'import depuis la source externe ?\n\nLes matchs et équipes seront mis à jour. Les pronostics existants sont conservés.'
    )) return;
    setScrapeRunning(true);
    setScrapeFlash(null);
    try {
      const res = await authFetch(`${API}/api/admin/scrape`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      pollRef.current = setTimeout(pollScrapeStatus, 2000);
    } catch (err) {
      setScrapeRunning(false);
      setScrapeFlash({ text: err.message, isError: true });
      setTimeout(() => setScrapeFlash(null), 6000);
    }
  };

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
      setMatches((prev) =>
        prev.map((m) => m.id === matchId
          ? { ...m, status: 'finished', home_score: Number(s.home), away_score: Number(s.away) }
          : m)
      );
      showFlash(matchId, '✓ Points calculés', false);
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

  const pending  = matches.filter((m) => m.status !== 'finished');
  const finished = matches.filter((m) => m.status === 'finished');
  const displayed = tab === 'pending' ? pending : finished;

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-black" style={{ color: 'var(--text)' }}>Interface Admin</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Saisie des résultats — les points sont calculés automatiquement
        </p>
      </div>

      {/* Section scraping */}
      <div className="card p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold" style={{ color: 'var(--text)' }}>Import des données</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Met à jour matchs, équipes et buteurs depuis la source externe. Les pronostics existants sont conservés.
          </p>
          {scrapeLast && (
            <p className="text-xs mt-1" style={{ color: scrapeLast.success ? 'var(--accent)' : '#f87171' }}>
              Dernier import : {scrapeLast.success ? '✓ succès' : '✗ ' + scrapeLast.error}
              {scrapeLast.trigger ? ` (${scrapeLast.trigger})` : ''}
              {' — '}{new Date(scrapeLast.at).toLocaleString('fr-FR')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {scrapeFlash && (
            <span className={`text-xs ${scrapeFlash.isError ? 'text-red-400' : 'text-green-400'}`}>
              {scrapeFlash.text}
            </span>
          )}
          <button
            onClick={handleScrape}
            disabled={scrapeRunning}
            className="btn btn-primary text-sm px-4 py-2">
            {scrapeRunning ? '⏳ Import en cours…' : '↻ Lancer le scraping'}
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'pending',  label: `À saisir (${pending.length})` },
          { key: 'finished', label: `Terminés (${finished.length})` },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`pill${tab === t.key ? ' active' : ''}`}
            style={tab === t.key ? {} : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {displayed.length === 0 && (
        <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          {tab === 'pending' ? 'Tous les matchs ont un résultat.' : 'Aucun match terminé.'}
        </p>
      )}

      <div className="space-y-2">
        {displayed.map((match) => {
          const s   = scores[match.id] || { home: '', away: '' };
          const msg = flash[match.id];

          return (
            <div key={match.id} className="card p-4 flex flex-wrap sm:flex-nowrap items-center gap-4">
              {/* Équipes */}
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="font-semibold truncate w-32 text-right" style={{ color: 'var(--text)' }}>
                  {match.home_team}
                </span>
                {match.status === 'finished' ? (
                  <span className="font-black text-xl w-16 text-center shrink-0" style={{ color: 'var(--accent)' }}>
                    {match.home_score}–{match.away_score}
                  </span>
                ) : (
                  <span className="w-16 text-center shrink-0 text-sm" style={{ color: 'var(--text-muted)' }}>vs</span>
                )}
                <span className="font-semibold truncate w-32" style={{ color: 'var(--text)' }}>
                  {match.away_team}
                </span>
              </div>

              {/* Date */}
              <span className="text-xs hidden md:block w-28 shrink-0 text-right" style={{ color: 'var(--text-muted)' }}>
                {new Date(match.match_datetime).toLocaleString('fr-FR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
              </span>

              {/* Saisie */}
              {match.status !== 'finished' ? (
                <div className="flex items-center gap-2 shrink-0">
                  <input type="number" min="0" max="99" placeholder="0" value={s.home}
                    onChange={(e) => handleScore(match.id, 'home', e.target.value)}
                    className="score-box" />
                  <span className="font-black text-sm" style={{ color: 'var(--text-muted)' }}>:</span>
                  <input type="number" min="0" max="99" placeholder="0" value={s.away}
                    onChange={(e) => handleScore(match.id, 'away', e.target.value)}
                    className="score-box" />
                  <button
                    onClick={() => handleSubmit(match.id)}
                    disabled={saving[match.id] || s.home === '' || s.away === ''}
                    className="btn btn-primary text-sm px-4 py-1.5">
                    {saving[match.id] ? '…' : 'Valider'}
                  </button>
                  {msg && (
                    <span className={`text-xs ${msg.isError ? 'text-red-400' : 'text-green-400'}`}>
                      {msg.text}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm font-semibold text-green-400 shrink-0">✓ Scoré</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
