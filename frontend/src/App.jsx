import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
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
function Home() {
  const { t } = useLang();
  const isLoggedIn = !!localStorage.getItem('user');
  if (isLoggedIn) return <Navigate to="/matches" replace />;

  return (
    <div className="max-w-3xl mx-auto mt-16 text-center px-4">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5"
          style={{ background: 'var(--accent-glow)', border: '2px solid var(--accent)' }}>
          <span className="text-4xl">⚽</span>
        </div>
        <h1 className="text-5xl font-black mt-2 tracking-tight" style={{ color: 'var(--text)' }}>
          WC<span style={{ color: 'var(--accent)' }}>Predictor</span>
        </h1>
        <p style={{ color: 'var(--text-muted)' }} className="mt-3 text-lg">
          {t('home.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 my-10">
        {[
          { n: '48',  k: 'home.stats.teams' },
          { n: '104', k: 'home.stats.matches' },
          { n: '3',   k: 'home.stats.pts' },
        ].map((s) => (
          <div key={s.n} className="card p-5">
            <p className="text-3xl font-black" style={{ color: 'var(--accent)' }}>{s.n}</p>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm mt-1">{t(s.k)}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        <Link to="/register" className="btn btn-primary text-base px-8 py-3">{t('home.cta.register')}</Link>
        <Link to="/login"    className="btn btn-ghost  text-base px-8 py-3">{t('home.cta.login')}</Link>
      </div>

      <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        {[
          { pk: 'home.rules.exact.pts',   lk: 'home.rules.exact.label',   dk: 'home.rules.exact.desc',   color: 'var(--accent)' },
          { pk: 'home.rules.correct.pts', lk: 'home.rules.correct.label', dk: 'home.rules.correct.desc', color: '#22c55e' },
          { pk: 'home.rules.wrong.pts',   lk: 'home.rules.wrong.label',   dk: 'home.rules.wrong.desc',   color: '#ef4444' },
        ].map((r) => (
          <div key={r.pk} className="card p-5">
            <p className="text-2xl font-black" style={{ color: r.color }}>{t(r.pk)}</p>
            <p className="font-semibold mt-1" style={{ color: 'var(--text)' }}>{t(r.lk)}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t(r.dk)}</p>
          </div>
        ))}
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
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="text-lg font-black tracking-tight text-white">
            WC<span style={{ color: 'var(--accent)' }}>Predictor</span>
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
          <button
            onClick={toggleLang}
            className="theme-toggle text-xs font-bold tracking-wide"
            title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
            style={{ width: 'auto', padding: '0 0.625rem', gap: '0.25rem', fontSize: '0.75rem', letterSpacing: '0.05em' }}
          >
            {lang === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
          </button>
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
