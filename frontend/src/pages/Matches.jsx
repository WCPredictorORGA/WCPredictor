import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { API, authFetch } from '../config.js';
import { useLang } from '../LanguageContext.jsx';
import { flagUrl } from '../flags.js';
import { teamName } from '../teamNames.js';
import BotnaruCard from '../components/BotnaruCard.jsx';

const STAGE_ORDER = ['group', 'round32', 'round16', 'quarter', 'semi', 'final'];

const STATUS_STYLE = {
  scheduled: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
  live:      { bg: 'rgba(34,197,94,0.15)',  color: '#22c55e', border: 'rgba(34,197,94,0.35)' },
  finished:  { bg: 'var(--bg-input)',        color: 'var(--text-muted)', border: 'var(--border)' },
};

const badgeClass = (pts) => {
  if (pts === 3) return 'badge-exact';
  if (pts === 1) return 'badge-correct';
  if (pts === 0) return 'badge-wrong';
  return 'badge-pending';
};

/* ── Filter icon SVG ── */
const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export default function Matches() {
  const { t, lang } = useLang();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [botPredictions, setBotPredictions] = useState({});
  const [inputs, setInputs] = useState({});
  const [saving, setSaving] = useState({});
  const [flash, setFlash] = useState({});
  const { state } = useLocation();
  const [groupFilter, setGroupFilter]   = useState(null);
  const [statusFilter, setStatusFilter] = useState(state?.statusFilter ?? 'scheduled');
  const [filterOpen, setFilterOpen]     = useState(false);
  const filterRef   = useRef(null);
  const firstCardRef = useRef(null);
  const scrolledRef  = useRef(false);

  useEffect(() => {
    loadMatches();
    loadPredictions();
    loadBotPredictions();
  }, []);

  // Scroll au premier match dès que les données arrivent
  useEffect(() => {
    if (matches.length > 0 && !scrolledRef.current) {
      scrolledRef.current = true;
      setTimeout(() => {
        firstCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [matches]);

  // Fermer le popover au clic extérieur
  useEffect(() => {
    const onDown = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const loadMatches = async () => {
    try {
      const res = await fetch(`${API}/api/matches`);
      const data = await res.json();
      setMatches(data.matches || []);
    } catch { /* réseau */ }
  };

  const loadBotPredictions = async () => {
    try {
      const res = await fetch(`${API}/api/bot-predictions`);
      const data = await res.json();
      const map = {};
      (data.predictions || []).forEach((p) => { map[p.match_id] = p; });
      setBotPredictions(map);
    } catch { /* service IA pas lancé */ }
  };

  const loadPredictions = async () => {
    try {
      const res = await authFetch(`${API}/api/predictions`);
      const data = await res.json();
      const predMap = {}, inputMap = {};
      (data.predictions || []).forEach((p) => {
        predMap[p.match_id] = p;
        inputMap[p.match_id] = { home: String(p.pred_home), away: String(p.pred_away) };
      });
      setPredictions(predMap);
      setInputs(inputMap);
    } catch { /* réseau */ }
  };

  const handleInput = (matchId, side, value) => {
    setInputs((prev) => ({
      ...prev,
      [matchId]: { home: prev[matchId]?.home ?? '', away: prev[matchId]?.away ?? '', ...prev[matchId], [side]: value },
    }));
  };

  const handleSave = async (matchId) => {
    const inp = inputs[matchId] || {};
    if (inp.home === '' || inp.away === '') return;
    setSaving((prev) => ({ ...prev, [matchId]: true }));
    try {
      const res = await authFetch(`${API}/api/predictions`, {
        method: 'POST',
        body: JSON.stringify({ match_id: matchId, pred_home: Number(inp.home), pred_away: Number(inp.away) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setPredictions((prev) => ({ ...prev, [matchId]: { ...prev[matchId], ...data.prediction } }));
      showFlash(matchId, t('matches.saved'), false);
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

  const resetFilters = () => { setGroupFilter(null); setStatusFilter('all'); };

  const groups = [...new Set(matches.map((m) => m.group_letter).filter(Boolean))].sort();
  const activeCount = (statusFilter !== 'all' ? 1 : 0) + (groupFilter ? 1 : 0);

  const visibleMatches = matches.filter((m) => {
    if (groupFilter && m.group_letter !== groupFilter) return false;
    if (statusFilter === 'scheduled' && m.status !== 'scheduled') return false;
    if (statusFilter === 'finished'  && m.status !== 'finished')  return false;
    return true;
  });
  const grouped = visibleMatches.reduce((acc, m) => {
    if (!acc[m.stage]) acc[m.stage] = [];
    acc[m.stage].push(m);
    return acc;
  }, {});

  const STAGE_LABELS = {
    group:   t('matches.stage.group'),
    round32: t('matches.stage.round32'),
    round16: t('matches.stage.round16'),
    quarter: t('matches.stage.quarter'),
    semi:    t('matches.stage.semi'),
    final:   t('matches.stage.final'),
  };

  const STATUS_LABEL = {
    scheduled: t('matches.status.upcoming'),
    live:      t('matches.status.live'),
    finished:  t('matches.status.finished'),
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Titre + bouton filtre */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-black" style={{ color: 'var(--text)' }}>{t('matches.title')}</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{t('matches.subtitle')}</p>
        </div>

        {/* Bouton filtre + popover */}
        <div className="relative shrink-0" ref={filterRef}>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="btn btn-ghost flex items-center gap-2 text-sm px-3 py-2"
            style={filterOpen ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
          >
            <FilterIcon />
            {t('matches.filter.title')}
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-black"
                style={{ background: 'var(--accent)', color: '#000', marginLeft: '2px' }}>
                {activeCount}
              </span>
            )}
          </button>

          {/* Popover */}
          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 z-40 w-72 card p-4 space-y-4"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>

              {/* Statut */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-2"
                  style={{ color: 'var(--text-muted)' }}>{t('matches.filter.status')}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    ['all',       t('matches.filter.all')],
                    ['scheduled', t('matches.filter.upcoming')],
                    ['finished',  t('matches.filter.finished')],
                  ].map(([val, label]) => (
                    <button key={val} onClick={() => setStatusFilter(val)}
                      className={`pill${statusFilter === val ? ' active' : ''}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Groupes */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-2"
                  style={{ color: 'var(--text-muted)' }}>{t('matches.filter.groups')}</p>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setGroupFilter(null)}
                    className={`pill${groupFilter === null ? ' active' : ''}`}>
                    {t('matches.filter.allg')}
                  </button>
                  {groups.map((g) => (
                    <button key={g} onClick={() => setGroupFilter(g === groupFilter ? null : g)}
                      className={`pill${groupFilter === g ? ' active' : ''}`}>{g}</button>
                  ))}
                </div>
              </div>

              {/* Réinitialiser */}
              {activeCount > 0 && (
                <button onClick={resetFilters}
                  className="w-full text-xs font-semibold py-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--accent)', background: 'var(--accent-glow)', border: '1px solid var(--accent)' }}>
                  {t('matches.filter.reset')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Résumé filtres actifs */}
      {activeCount > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {statusFilter !== 'all' && (
            <span className="pill active text-xs">
              {statusFilter === 'scheduled' ? t('matches.filter.upcoming') : t('matches.filter.finished')}
              <button onClick={() => setStatusFilter('all')} className="ml-1 opacity-70 hover:opacity-100">×</button>
            </span>
          )}
          {groupFilter && (
            <span className="pill active text-xs">
              {t('matches.filter.group')} {groupFilter}
              <button onClick={() => setGroupFilter(null)} className="ml-1 opacity-70 hover:opacity-100">×</button>
            </span>
          )}
        </div>
      )}

      {/* Carte de présentation Botnaru */}
      <BotnaruCard />

      {/* Matchs par stage */}
      {STAGE_ORDER.filter((s) => grouped[s]).map((stage, stageIdx) => (
        <div key={stage} className="mb-8">
          <h3 className="text-xs font-black uppercase tracking-widest mb-3 pb-2 border-b"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
            {STAGE_LABELS[stage] || stage}
          </h3>

          <div className="space-y-2">
            {grouped[stage].map((match, matchIdx) => {
              const pred = predictions[match.id];
              const bot  = botPredictions[match.id];
              const inp  = inputs[match.id] || { home: '', away: '' };
              const msg  = flash[match.id];
              const st   = STATUS_STYLE[match.status] || STATUS_STYLE.scheduled;
              const canPredict = match.status === 'scheduled'
                && new Date(match.match_datetime) > new Date();

              const isFirst = stageIdx === 0 && matchIdx === 0;
              return (
                <div key={match.id} ref={isFirst ? firstCardRef : null} className="card overflow-hidden">
                  <div className="p-3 sm:p-4 flex flex-wrap sm:flex-nowrap items-center gap-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 w-20 text-center"
                      style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                      {STATUS_LABEL[match.status]}
                    </span>

                    <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
                      <span className="font-semibold text-right truncate w-24 sm:w-32 flex items-center justify-end gap-1.5" style={{ color: 'var(--text)' }}>
                        {teamName(match.home_team, lang)}
                        {flagUrl(match.home_team_code) && (
                          <img src={flagUrl(match.home_team_code)} alt={match.home_team_code}
                            width="20" height="15" className="shrink-0 rounded-sm" style={{ objectFit: 'cover' }} />
                        )}
                      </span>
                      {match.status === 'finished' ? (
                        <span className="text-xl font-black shrink-0 w-14 text-center" style={{ color: 'var(--accent)' }}>
                          {match.home_score}–{match.away_score}
                        </span>
                      ) : (
                        <span className="shrink-0 w-14 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                          {t('common.vs')}
                        </span>
                      )}
                      <span className="font-semibold text-left truncate w-24 sm:w-32 flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                        {flagUrl(match.away_team_code) && (
                          <img src={flagUrl(match.away_team_code)} alt={match.away_team_code}
                            width="20" height="15" className="shrink-0 rounded-sm" style={{ objectFit: 'cover' }} />
                        )}
                        {teamName(match.away_team, lang)}
                      </span>
                    </div>

                    <span className="text-xs shrink-0 hidden lg:block w-28 text-right" style={{ color: 'var(--text-muted)' }}>
                      {new Date(match.match_datetime).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>

                    {canPredict ? (
                      <div className="flex items-center justify-center gap-2 w-full sm:w-auto sm:shrink-0">
                        <input type="number" min="0" max="99" className="score-box" value={inp.home}
                          onChange={(e) => handleInput(match.id, 'home', e.target.value)} placeholder="–" />
                        <span className="font-black text-sm" style={{ color: 'var(--text-muted)' }}>:</span>
                        <input type="number" min="0" max="99" className="score-box" value={inp.away}
                          onChange={(e) => handleInput(match.id, 'away', e.target.value)} placeholder="–" />
                        <button onClick={() => handleSave(match.id)}
                          disabled={saving[match.id] || inp.home === '' || inp.away === ''}
                          className="btn btn-primary text-sm px-3 py-1.5">
                          {saving[match.id] ? '…' : pred ? t('matches.btn.modify') : t('matches.btn.validate')}
                        </button>
                        {msg && (
                          <span className={`text-xs ${msg.isError ? 'text-red-400' : 'text-green-400'}`}>
                            {msg.text}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-full sm:w-44 text-center space-y-1 sm:shrink-0">
                        {pred ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${badgeClass(pred.points_awarded)}`}>
                            {pred.pred_home}–{pred.pred_away}
                            {pred.points_awarded != null && <span className="opacity-80">· {pred.points_awarded}pt</span>}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('matches.not_predicted')}</span>
                        )}
                        {match.status !== 'finished' && (
                          <div className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                            🔒 {t('matches.closed')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {bot && canPredict && (() => {
                    const hp = Math.round(bot.prob_home_win * 100);
                    const dp = Math.round(bot.prob_draw * 100);
                    const ap = Math.round(bot.prob_away_win * 100);
                    const hasXG = bot.xg_home != null && bot.xg_away != null;
                    return (
                      <div className="px-4 pt-2.5 pb-3 border-t text-xs"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                        {/* Ligne 1 : label + score prédit + proba */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                          <span className="font-bold flex items-center gap-1.5" style={{ color: '#a78bfa' }}>
                            <img src="/botnaru.png" alt="Botnaru" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 10%' }} />
                            Botnaru
                          </span>
                          <span className="font-black" style={{ color: 'var(--accent)' }}>{bot.pred_home}–{bot.pred_away}</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            Dom. <span className="text-green-400 font-semibold">{hp}%</span>
                            {' · '}Nul <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>{dp}%</span>
                            {' · '}Ext. <span className="text-red-400 font-semibold">{ap}%</span>
                          </span>
                          {hasXG && (
                            <span className="ml-auto font-mono" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                              xG {Number(bot.xg_home).toFixed(2)} – {Number(bot.xg_away).toFixed(2)}
                            </span>
                          )}
                        </div>
                        {/* Barre de probabilité */}
                        <div style={{ height: 5, borderRadius: 999, overflow: 'hidden', background: 'var(--border)', display: 'flex', gap: 1 }}>
                          <div style={{ height: '100%', background: '#22c55e', width: `${hp}%`, borderRadius: '999px 0 0 999px', transition: 'width 0.6s ease' }} />
                          <div style={{ height: '100%', background: 'var(--text-muted)', width: `${dp}%`, transition: 'width 0.6s ease' }} />
                          <div style={{ height: '100%', background: '#ef4444', width: `${ap}%`, borderRadius: '0 999px 999px 0', transition: 'width 0.6s ease' }} />
                        </div>
                        <div className="flex justify-between mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                          <span>Dom. {hp}%</span>
                          <span>Ext. {ap}%</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {visibleMatches.length === 0 && (
        <div className="text-center py-20">
          <p style={{ color: 'var(--text-muted)' }}>
            {matches.length === 0 ? t('matches.empty') : t('matches.empty_filter')}
          </p>
        </div>
      )}
    </div>
  );
}
