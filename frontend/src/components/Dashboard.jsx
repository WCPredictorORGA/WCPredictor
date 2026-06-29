import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API, authFetch } from '../config.js';
import { useLang } from '../LanguageContext.jsx';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

const badgeClass = (pts) => {
  if (pts === 3) return 'badge-exact';
  if (pts === 1) return 'badge-correct';
  if (pts === 0) return 'badge-wrong';
  return 'badge-pending';
};

const badgeLabel = (p) => {
  if (p.points_awarded != null) return `${p.points_awarded} pt${p.points_awarded !== 1 ? 's' : ''}`;
  if (p.status === 'scheduled') return 'À venir';
  return '–';
};

export default function Dashboard() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return { username: 'Joueur' }; } })();
  const { t } = useLang();

  const [predictions, setPredictions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch(`${API}/api/predictions`).then((r) => r.json()),
      fetch(`${API}/api/leaderboard`).then((r) => r.json()),
    ])
      .then(([pd, lb]) => {
        setPredictions(pd.predictions || []);
        setLeaderboard(lb.leaderboard || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await authFetch(`${API}/api/auth/logout`, { method: 'POST' }).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  const totalPoints = predictions.reduce((s, p) => s + (p.points_awarded ?? 0), 0);
  const exact       = predictions.filter((p) => p.points_awarded === 3).length;
  const partial     = predictions.filter((p) => p.points_awarded === 1).length;
  const myRank      = leaderboard.findIndex((r) => r.username === user.username) + 1;

  const kpis = [
    { val: totalPoints,                 label: t('dashboard.stat.points'),  color: 'var(--accent)' },
    { val: myRank ? `#${myRank}` : '—', label: t('dashboard.stat.rank'),   color: '#818cf8' },
    { val: exact,                       label: t('dashboard.stat.exact'),   color: '#F5B705' },
    { val: partial,                     label: t('dashboard.stat.partial'), color: '#22c55e' },
  ];

  const rules = [
    { pts: '3', label: t('home.rules.exact.label'),   desc: t('home.rules.exact.desc'),   color: 'var(--accent)', bg: 'var(--accent-glow)' },
    { pts: '1', label: t('home.rules.correct.label'), desc: t('home.rules.correct.desc'), color: '#22c55e',       bg: 'rgba(34,197,94,0.12)' },
    { pts: '0', label: t('home.rules.wrong.label'),   desc: t('home.rules.wrong.desc'),   color: '#ef4444',       bg: 'rgba(239,68,68,0.10)' },
  ];

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl shrink-0"
            style={{ background: 'var(--accent-glow)', border: '2.5px solid var(--accent)', color: 'var(--accent)' }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {t('dashboard.welcome')},
            </p>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
              {user.username}
            </h1>
          </div>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Link to="/matches" state={{ statusFilter: 'scheduled' }} className="btn btn-primary text-sm px-5 py-2.5">
            {t('dashboard.btn.predict')}
          </Link>
          <button onClick={handleLogout} className="btn btn-danger">
            {t('dashboard.btn.logout')}
          </button>
        </div>
      </div>

      {/* ── KPIs (4 cartes) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
        {kpis.map((k) => (
          <div key={k.label} className="card p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: k.color, opacity: 0.85, borderRadius: 'var(--radius) var(--radius) 0 0' }} />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {k.label}
            </p>
            <p className="text-4xl font-black leading-none mt-3" style={{ color: k.color }}>
              {k.val}
            </p>
          </div>
        ))}
      </div>

      {/* ── Layout principal : liste prédictions + sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

        {/* Prédictions */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
            <h3 className="font-black text-sm" style={{ color: 'var(--text)' }}>
              {t('dashboard.predictions.title')}
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {predictions.length}
            </span>
          </div>

          {loading && (
            <p className="text-center py-10" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
          )}

          {!loading && predictions.length === 0 && (
            <div className="text-center py-10">
              <p style={{ color: 'var(--text-muted)' }}>{t('dashboard.predictions.empty')}</p>
              <Link to="/matches" state={{ statusFilter: 'scheduled' }} className="btn btn-primary inline-flex mt-5 px-6 py-2">
                {t('dashboard.predictions.cta')}
              </Link>
            </div>
          )}

          {!loading && predictions.length > 0 && (
            <div className="p-3 flex flex-col gap-2">
              {predictions.map((p) => (
                <div key={p.id}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-150"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0"
                    style={p.status === 'finished'
                      ? { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                      : { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                    {p.status === 'finished' ? t('dashboard.badge.finished') : t('dashboard.badge.upcoming')}
                  </span>

                  <div className="flex-1 flex items-center gap-1.5 min-w-0 text-sm">
                    <span className="font-semibold truncate" style={{ color: 'var(--text)' }}>{p.home_team}</span>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>vs</span>
                    <span className="font-semibold truncate" style={{ color: 'var(--text)' }}>{p.away_team}</span>
                  </div>

                  <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {t('dashboard.pred.label')} <strong style={{ color: 'var(--accent)' }}>{p.pred_home}–{p.pred_away}</strong>
                  </span>

                  {p.status === 'finished' && (
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                      → <strong style={{ color: 'var(--text)' }}>{p.home_score}–{p.away_score}</strong>
                    </span>
                  )}

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${badgeClass(p.points_awarded)}`}>
                    {badgeLabel(p)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">

          {/* Mini classement */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
              <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {t('leaderboard.title')}
              </h3>
              <Link to="/leaderboard" className="text-xs font-bold hover:underline transition-colors"
                style={{ color: 'var(--accent)' }}>
                {t('dashboard.lb.see_all')} →
              </Link>
            </div>
            <div>
              {leaderboard.slice(0, 6).map((r, i) => {
                const isMe  = r.username === user.username;
                const isBot = r.username === 'Botnaru';
                const bg    = isBot ? 'rgba(167,139,250,0.07)' : isMe ? 'var(--accent-glow)' : 'transparent';
                return (
                  <div key={r.user_id}
                    className="flex items-center gap-2.5 px-4 py-2.5 border-b transition-colors"
                    style={{ borderColor: 'var(--border)', background: bg }}
                    onMouseEnter={(e) => { if (!isMe && !isBot) e.currentTarget.style.background = 'var(--bg-input)'; }}
                    onMouseLeave={(e) => { if (!isMe && !isBot) e.currentTarget.style.background = bg; }}
                  >
                    <span className="w-6 text-center text-sm shrink-0 flex items-center justify-center">
                      {isBot
                        ? <img src="/botnaru.png" alt="Botnaru" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '1.5px solid #a78bfa' }} />
                        : (MEDAL[i + 1] || <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>)}
                    </span>
                    <span className="flex-1 text-sm truncate flex items-center gap-1.5"
                      style={{ fontWeight: isBot ? 800 : 600, color: isBot ? '#a78bfa' : 'var(--text)' }}>
                      {r.username}
                      {isBot && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(167,139,250,0.18)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', flexShrink: 0 }}>
                          IA
                        </span>
                      )}
                      {isMe && !isBot && (
                        <span className="text-xs" style={{ color: 'var(--accent)' }}>· {t('leaderboard.you')}</span>
                      )}
                    </span>
                    <span className="font-black text-base shrink-0" style={{ color: isBot ? '#a78bfa' : 'var(--accent)' }}>
                      {r.total_points}
                    </span>
                  </div>
                );
              })}
              {!loading && leaderboard.length === 0 && (
                <p className="text-center py-5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t('leaderboard.empty')}
                </p>
              )}
            </div>
          </div>

          {/* Barème des points */}
          <div className="card p-5">
            <h3 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
              {t('dashboard.rules.title')}
            </h3>
            <div className="flex flex-col gap-3">
              {rules.map((r) => (
                <div key={r.pts} className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: r.bg }}>
                    <span className="text-xl font-black" style={{ color: r.color }}>{r.pts}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{r.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
