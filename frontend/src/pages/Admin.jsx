import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, authFetch } from '../config.js';
import { useLang } from '../LanguageContext.jsx';

const LOCALE_MAP = { fr: 'fr-FR', en: 'en-GB', sk: 'sk-SK' };

export default function Admin() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
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

  const [botRunning, setBotRunning] = useState(false);
  const [botFlash, setBotFlash] = useState(null);
  const [seedFlash, setSeedFlash] = useState(null);

  const [roleUsername, setRoleUsername] = useState('');
  const [roleFlash, setRoleFlash] = useState(null);

  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', email: '', password: '' });
  const [modFlash, setModFlash] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/');
  }, []);

  useEffect(() => {
    fetch(`${API}/api/matches`)
      .then((r) => r.json())
      .then((d) => setMatches(d.matches || []))
      .catch(() => {});
  }, []);

  const loadUsers = () =>
    authFetch(`${API}/api/admin/users`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {});

  useEffect(() => { loadUsers(); }, []);

  const handleEditStart = (u) => {
    setEditingId(u.id);
    setEditForm({ username: u.username, email: u.email, password: '' });
    setModFlash(null);
  };

  const handleEditSave = async (id) => {
    const orig = users.find((u) => u.id === id);
    const body = {};
    if (editForm.username !== orig.username) body.username = editForm.username;
    if (editForm.email    !== orig.email)    body.email    = editForm.email;
    if (editForm.password)                   body.password = editForm.password;

    if (Object.keys(body).length === 0) { setEditingId(null); return; }

    try {
      const res  = await authFetch(`${API}/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setModFlash({ text: data.message, isError: false });
      setEditingId(null);
      loadUsers();
    } catch (err) {
      setModFlash({ text: err.message, isError: true });
    } finally {
      setTimeout(() => setModFlash(null), 5000);
    }
  };

  const handleDelete = async (id, username) => {
    const msg = t('admin.moderation.confirm_delete').replace('{username}', username);
    if (!window.confirm(msg)) return;
    try {
      const res  = await authFetch(`${API}/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setModFlash({ text: data.message, isError: false });
      if (editingId === id) setEditingId(null);
      loadUsers();
    } catch (err) {
      setModFlash({ text: err.message, isError: true });
    } finally {
      setTimeout(() => setModFlash(null), 5000);
    }
  };

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
          setScrapeFlash({ text: t('admin.import.done'), isError: false });
          fetch(`${API}/api/matches`).then((r2) => r2.json()).then((d2) => setMatches(d2.matches || []));
        } else if (d.last?.success === false) {
          setScrapeFlash({ text: d.last.error, isError: true });
        }
        setTimeout(() => setScrapeFlash(null), 6000);
      }
    } catch {
      setScrapeRunning(false);
      setScrapeFlash({ text: t('admin.import.unavailable'), isError: true });
      setTimeout(() => setScrapeFlash(null), 6000);
    }
  };

  const handleScrape = async () => {
    if (!window.confirm(t('admin.import.confirm'))) return;
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

  const handleGenerateBot = async (upsert = false) => {
    setBotRunning(true);
    setBotFlash(null);
    try {
      const url = `${API}/api/admin/generate-bot-predictions${upsert ? '?upsert=true' : ''}`;
      const res = await authFetch(url, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      const count = data.inserted?.length ?? 0;
      setBotFlash({
        text: count > 0
          ? `✓ ${count} prédiction(s) via Poisson`
          : '✓ ' + data.message,
        isError: false,
        detail: data.inserted || [],
      });
    } catch (err) {
      setBotFlash({ text: err.message, isError: true, detail: [] });
    } finally {
      setBotRunning(false);
      setTimeout(() => setBotFlash(null), 12000);
    }
  };

  const handleSeedBotnaru = async () => {
    setSeedFlash(null);
    try {
      const res = await authFetch(`${API}/api/admin/seed-botnaru-prediction`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setSeedFlash({ text: '✓ ' + data.message, isError: false });
    } catch (err) {
      setSeedFlash({ text: err.message, isError: true });
    } finally {
      setTimeout(() => setSeedFlash(null), 8000);
    }
  };

  const handleSetRole = async (role) => {
    if (!roleUsername.trim()) return;
    setRoleFlash(null);
    try {
      const res = await authFetch(`${API}/api/admin/set-role`, {
        method: 'POST',
        body: JSON.stringify({ username: roleUsername.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setRoleFlash({ text: data.message, isError: false });
      setRoleUsername('');
    } catch (err) {
      setRoleFlash({ text: err.message, isError: true });
    } finally {
      setTimeout(() => setRoleFlash(null), 6000);
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
      showFlash(matchId, t('admin.saved'), false);
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
        <h2 className="text-3xl font-black" style={{ color: 'var(--text)' }}>{t('admin.title')}</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('admin.subtitle')}
        </p>
      </div>

      {/* Section scraping */}
      <div className="card p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold" style={{ color: 'var(--text)' }}>{t('admin.import.title')}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {t('admin.import.desc')}
          </p>
          {scrapeLast && (
            <p className="text-xs mt-1" style={{ color: scrapeLast.success ? 'var(--accent)' : '#f87171' }}>
              {t('admin.import.last')} {scrapeLast.success ? t('admin.import.success') : '✗ ' + scrapeLast.error}
              {scrapeLast.trigger ? ` (${scrapeLast.trigger})` : ''}
              {' — '}{new Date(scrapeLast.at).toLocaleString(LOCALE_MAP[lang] || 'fr-FR')}
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
            {scrapeRunning ? t('admin.import.running') : t('admin.import.btn')}
          </button>
        </div>
      </div>

      {/* Section Botnaru */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold" style={{ color: 'var(--text)' }}>{t('admin.bot.title')}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {t('admin.bot.desc')}
            </p>
            {botFlash && (
              <p className={`text-xs mt-2 font-semibold ${botFlash.isError ? 'text-red-400' : 'text-green-400'}`}>
                {botFlash.text}
              </p>
            )}
            {botFlash?.detail?.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border text-xs font-mono"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-input)', padding: '6px 10px' }}>
                {botFlash.detail.map((d, i) => (
                  <div key={i} className="py-0.5" style={{ color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--text)' }}>{d.match}</span>
                    {' → '}<span style={{ color: 'var(--accent)', fontWeight: 700 }}>{d.score}</span>
                    {' '}xG [{d.xg}]
                    {' '}({d.probs})
                    {' '}<span style={{ opacity: 0.5 }}>[{d.method}]</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleGenerateBot(false)}
              disabled={botRunning}
              className="btn btn-primary text-sm px-4 py-2">
              {botRunning ? t('admin.bot.running') : t('admin.bot.generate')}
            </button>
            <button
              onClick={() => handleGenerateBot(true)}
              disabled={botRunning}
              className="btn text-sm px-4 py-2"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              {t('admin.bot.recalculate')}
            </button>
          </div>
        </div>
      </div>

      {/* Section gestion des rôles */}
      <div className="card p-4 mb-6">
        <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{t('admin.roles.title')}</p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          {t('admin.roles.desc')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder={t('admin.roles.placeholder')}
            value={roleUsername}
            onChange={(e) => setRoleUsername(e.target.value)}
            className="flex-1 min-w-40 text-sm px-3 py-2 rounded-lg"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <button
            onClick={() => handleSetRole('admin')}
            disabled={!roleUsername.trim()}
            className="btn btn-primary text-sm px-4 py-2">
            {t('admin.roles.set_admin')}
          </button>
          <button
            onClick={() => handleSetRole('user')}
            disabled={!roleUsername.trim()}
            className="btn text-sm px-4 py-2"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {t('admin.roles.set_user')}
          </button>
        </div>
        {roleFlash && (
          <p className={`text-xs mt-2 font-semibold ${roleFlash.isError ? 'text-red-400' : 'text-green-400'}`}>
            {roleFlash.text}
          </p>
        )}
      </div>

      {/* Section modération */}
      <div className="card p-4 mb-6">
        <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{t('admin.moderation.title')}</p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{t('admin.moderation.desc')}</p>

        {modFlash && (
          <p className={`text-xs mb-3 font-semibold ${modFlash.isError ? 'text-red-400' : 'text-green-400'}`}>
            {modFlash.text}
          </p>
        )}

        {users.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('admin.moderation.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  <th className="pb-2 pr-4 font-medium">{t('admin.moderation.col.username')}</th>
                  <th className="pb-2 pr-4 font-medium">{t('admin.moderation.col.email')}</th>
                  <th className="pb-2 pr-4 font-medium">{t('admin.moderation.col.role')}</th>
                  <th className="pb-2 pr-4 font-medium hidden md:table-cell">{t('admin.moderation.col.created')}</th>
                  <th className="pb-2 font-medium text-right">{t('admin.moderation.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  editingId === u.id ? (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={5} className="py-3">
                        <div className="flex flex-wrap gap-2 items-end">
                          <div className="flex flex-col gap-1 min-w-32">
                            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('admin.moderation.field.username')}</label>
                            <input
                              type="text"
                              value={editForm.username}
                              onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                              className="text-sm px-2 py-1 rounded"
                              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
                            />
                          </div>
                          <div className="flex flex-col gap-1 min-w-44">
                            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('admin.moderation.field.email')}</label>
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                              className="text-sm px-2 py-1 rounded"
                              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
                            />
                          </div>
                          <div className="flex flex-col gap-1 min-w-44">
                            <label className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('admin.moderation.field.password')}</label>
                            <input
                              type="password"
                              value={editForm.password}
                              placeholder="••••••••"
                              onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                              className="text-sm px-2 py-1 rounded"
                              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
                            />
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleEditSave(u.id)}
                              className="btn btn-primary text-xs px-3 py-1.5">
                              {t('admin.moderation.btn.save')}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn text-xs px-3 py-1.5"
                              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                              {t('admin.moderation.btn.cancel')}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="py-2.5 pr-4 font-medium" style={{ color: 'var(--text)' }}>{u.username}</td>
                      <td className="py-2.5 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          u.role === 'admin'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {u.role === 'admin' ? t('admin.moderation.badge.admin') : t('admin.moderation.badge.user')}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString(LOCALE_MAP[lang] || 'fr-FR')}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEditStart(u)}
                            className="btn text-xs px-3 py-1"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                            {t('admin.moderation.btn.edit')}
                          </button>
                          <button
                            onClick={() => handleDelete(u.id, u.username)}
                            className="btn text-xs px-3 py-1"
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
                            {t('admin.moderation.btn.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'pending',  label: `${t('admin.tab.pending')} (${pending.length})` },
          { key: 'finished', label: `${t('admin.tab.finished')} (${finished.length})` },
        ].map((tab_item) => (
          <button key={tab_item.key} onClick={() => setTab(tab_item.key)}
            className={`pill${tab === tab_item.key ? ' active' : ''}`}>
            {tab_item.label}
          </button>
        ))}
      </div>

      {displayed.length === 0 && (
        <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          {tab === 'pending' ? t('admin.empty.pending') : t('admin.empty.finished')}
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
                {new Date(match.match_datetime).toLocaleString(LOCALE_MAP[lang] || 'fr-FR', {
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
                    {saving[match.id] ? '…' : t('admin.btn.validate')}
                  </button>
                  {msg && (
                    <span className={`text-xs ${msg.isError ? 'text-red-400' : 'text-green-400'}`}>
                      {msg.text}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm font-semibold text-green-400 shrink-0">{t('admin.scored')}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
