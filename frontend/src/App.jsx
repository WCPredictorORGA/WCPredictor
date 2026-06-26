import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { API } from './config.js';
import { LanguageProvider, useLang } from './LanguageContext.jsx';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import ProtectedRoute from './components/ProtectedRoute';
import Matches from './pages/Matches';
import Stats from './pages/Stats';
import Admin from './pages/Admin';

/* ── Home ── */
const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

function Home() {
  const { t } = useLang();
  const isLoggedIn = !!localStorage.getItem('user');
  const [stats, setStats]  = useState(null);
  const [leaderboard, setLB] = useState([]);

  useEffect(() => {
    if (isLoggedIn) return;
    fetch(`${API}/api/home-stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});

    fetch(`${API}/api/leaderboard`)
      .then((r) => r.json())
      .then((d) => setLB((d.leaderboard || []).slice(0, 5)))
      .catch(() => {});
  }, [isLoggedIn]);

  if (isLoggedIn) return <Navigate to="/matches" replace />;

  const kpis = [
    {
      value: stats ? stats.remaining_matches : null,
      label: t('home.kpi.remaining'),
      icon: '📅',
      color: 'var(--accent)',
    },
    {
      value: stats?.top_player ? stats.top_player.total_points : null,
      label: t('home.kpi.top_pts'),
      sub: stats?.top_player?.username,
      icon: '🏆',
      color: '#F5B705',
    },
    {
      value: stats?.ai_winner ? stats.ai_winner.code : null,
      label: t('home.kpi.ai_winner'),
      sub: stats?.ai_winner?.name,
      icon: '🤖',
      color: '#a78bfa',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto mt-10 px-4">
      {/* Hero */}
      <div className="text-center mb-10">
        <img src="/favicon.svg" alt="World Cup Predictor.AI" width="72" height="72" className="inline-block mb-4" />
        <h1 className="text-5xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
          World Cup Predictor<span style={{ color: 'var(--accent)' }}>.AI</span>
        </h1>
        <p style={{ color: 'var(--text-muted)' }} className="mt-3 text-lg max-w-xl mx-auto">
          {t('home.subtitle')}
        </p>
        <div className="flex gap-3 justify-center flex-wrap mt-6">
          <Link to="/register" className="btn btn-primary text-base px-8 py-3">{t('home.cta.register')}</Link>
          <Link to="/login"    className="btn btn-ghost  text-base px-8 py-3">{t('home.cta.login')}</Link>
        </div>
      </div>

      {/* KPIs dynamiques */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="card p-5 text-center">
            <div className="text-2xl mb-1">{k.icon}</div>
            <p className="text-3xl font-black" style={{ color: k.color }}>
              {k.value != null ? k.value : <span style={{ color: 'var(--border)' }}>—</span>}
            </p>
            {k.sub && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{k.sub}</p>
            )}
            <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Botnaru banner */}
      <div className="card mb-8 overflow-hidden">
        <div className="flex items-center gap-5 px-6 py-5">
          <div className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'rgba(167,139,250,0.15)', border: '1.5px solid rgba(167,139,250,0.4)' }}>
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-lg" style={{ color: '#a78bfa' }}>{t('home.botnaru.tagline')}</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('home.botnaru.desc')}</p>
          </div>
          <Link to="/register" className="btn btn-primary shrink-0 text-sm px-5 py-2">
            {t('home.cta.register')}
          </Link>
        </div>
      </div>

      {/* Layout 2 colonnes : Leaderboard + Règles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

        {/* Leaderboard public */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center gap-2"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
            <span className="text-base">🏅</span>
            <h3 className="font-black text-sm" style={{ color: 'var(--text)' }}>
              {t('home.leaderboard.title')}
            </h3>
          </div>

          {leaderboard.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('home.leaderboard.empty')}
            </p>
          ) : (
            <div>
              {leaderboard.map((row, i) => {
                const rank = i + 1;
                return (
                  <div key={row.user_id}
                    className="flex items-center gap-3 px-5 py-3 border-b transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-input)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <span className="w-7 text-center text-base shrink-0">
                      {MEDAL[rank] || <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>{rank}</span>}
                    </span>
                    <span className="flex-1 font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                      {row.username}
                    </span>
                    <span className="font-black text-base shrink-0" style={{ color: 'var(--accent)' }}>
                      {row.total_points}
                      <span className="font-normal text-xs ml-0.5" style={{ color: 'var(--text-muted)' }}>
                        {' '}{t('home.leaderboard.pts')}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-5 py-3 text-center">
            <Link to="/login" className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              {t('home.cta.login')} →
            </Link>
          </div>
        </div>

        {/* Règles */}
        <div className="space-y-3">
          {[
            { pk: 'home.rules.exact.pts',   lk: 'home.rules.exact.label',   dk: 'home.rules.exact.desc',   color: 'var(--accent)' },
            { pk: 'home.rules.correct.pts', lk: 'home.rules.correct.label', dk: 'home.rules.correct.desc', color: '#22c55e' },
            { pk: 'home.rules.wrong.pts',   lk: 'home.rules.wrong.label',   dk: 'home.rules.wrong.desc',   color: '#ef4444' },
          ].map((r) => (
            <div key={r.pk} className="card p-4 flex items-center gap-4">
              <p className="text-2xl font-black w-14 shrink-0 text-center" style={{ color: r.color }}>{t(r.pk)}</p>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{t(r.lk)}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t(r.dk)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── NavBar ── */
function NavBar({ dark, onToggle }) {
  const { lang, toggleLang, t } = useLang();
  const isLoggedIn = !!localStorage.getItem('user');
  const location = useLocation();
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

  const navLink = (to, label) => (
    <Link key={to} to={to} className={`nav-link${location.pathname === to ? ' active' : ''}`}>
      {label}
    </Link>
  );

  return (
    <nav style={{ backgroundColor: 'var(--bg-nav)' }} className="px-6 py-4 shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <img src="/favicon.svg" alt="" width="30" height="30" className="shrink-0" />
          <span className="text-lg font-black tracking-tight text-white whitespace-nowrap">
            World Cup Predictor<span style={{ color: 'var(--accent)' }}>.AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {isLoggedIn ? (
            <>
              {navLink('/matches',     t('nav.matches'))}
              {navLink('/stats',       t('nav.stats'))}
              {navLink('/leaderboard', t('nav.leaderboard'))}
              {navLink('/dashboard',   t('nav.dashboard'))}
              {user?.role === 'admin' && navLink('/admin', t('nav.admin'))}
            </>
          ) : (
            <>
              {navLink('/login', t('nav.login'))}
              <Link to="/register" className="btn btn-primary text-sm px-4 py-2">{t('nav.register')}</Link>
            </>
          )}
        </div>

        {/* Actions : langue + thème */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-full overflow-hidden shrink-0"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
            {['fr', 'en'].map((l) => (
              <button key={l} onClick={() => l !== lang && toggleLang()}
                className="px-3 py-1 text-xs font-black uppercase tracking-wide transition-all duration-200"
                style={lang === l
                  ? { background: 'var(--accent)', color: '#000' }
                  : { color: 'var(--text-muted)', cursor: 'pointer' }}>
                {l}
              </button>
            ))}
          </div>
          <button className="theme-toggle" onClick={onToggle} title={dark ? 'Mode clair' : 'Mode nuit'}>
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ── App ── */
export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') !== 'light');

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <LanguageProvider>
      <div className={dark ? 'dark' : ''}>
        <Router>
          <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
            <NavBar dark={dark} onToggle={toggleDark} />

            <main className="max-w-6xl mx-auto px-4 py-8">
              <Routes>
                <Route path="/login"    element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/"         element={<Home />} />

                <Route path="/matches"     element={<ProtectedRoute><Matches /></ProtectedRoute>} />
                <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                <Route path="/stats"       element={<ProtectedRoute><Stats /></ProtectedRoute>} />
                <Route path="/admin"       element={<ProtectedRoute><Admin /></ProtectedRoute>} />

                <Route path="*" element={
                  <NotFound />
                } />
              </Routes>
            </main>
          </div>
        </Router>
      </div>
    </LanguageProvider>
  );
}

function NotFound() {
  const { t } = useLang();
  return (
    <div className="text-center mt-24">
      <p className="text-8xl font-black" style={{ color: 'var(--border)' }}>404</p>
      <p className="text-xl mt-4" style={{ color: 'var(--text-muted)' }}>{t('common.404')}</p>
      <Link to="/" className="btn btn-primary inline-flex mt-8 px-6 py-3">{t('common.back')}</Link>
    </div>
  );
}
