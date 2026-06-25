import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import ProtectedRoute from './components/ProtectedRoute';
import Matches from './pages/Matches';
import Stats from './pages/Stats';
import Admin from './pages/Admin';

function Home() {
  const isLoggedIn = !!localStorage.getItem('token');
  if (isLoggedIn) return <Navigate to="/matches" replace />;

  return (
    <div className="max-w-3xl mx-auto mt-16 text-center px-4">
      {/* Logo / titre */}
      <div className="mb-6">
        <span className="text-6xl">⚽</span>
        <h1 className="text-5xl font-black mt-4 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          WCPredictor
        </h1>
        <p className="text-slate-400 mt-3 text-lg">
          Coupe du Monde 2026 — Faites vos pronostics et affrontez vos amis !
        </p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4 my-10">
        <div className="bg-slate-800 rounded-xl p-5">
          <p className="text-3xl font-black text-blue-400">48</p>
          <p className="text-slate-400 text-sm mt-1">Équipes</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5">
          <p className="text-3xl font-black text-blue-400">104</p>
          <p className="text-slate-400 text-sm mt-1">Matchs</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5">
          <p className="text-3xl font-black text-blue-400">3</p>
          <p className="text-slate-400 text-sm mt-1">Points max / match</p>
        </div>
      </div>

      {/* Appel à l'action */}
      <div className="flex gap-4 justify-center">
        <Link
          to="/register"
          className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-bold text-lg transition"
        >
          Créer un compte
        </Link>
        <Link
          to="/login"
          className="bg-slate-700 hover:bg-slate-600 px-8 py-3 rounded-lg font-bold text-lg transition"
        >
          Se connecter
        </Link>
      </div>

      {/* Règles rapides */}
      <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        {[
          { pts: '3 pts', label: 'Score exact', color: 'text-yellow-400', desc: 'Vous trouvez le score précis du match' },
          { pts: '1 pt',  label: 'Bon résultat', color: 'text-green-400',  desc: 'Vous prédisez le bon vainqueur (ou le nul)' },
          { pts: '0 pt',  label: 'Raté',          color: 'text-red-400',   desc: 'Votre pronostic est incorrect' },
        ].map((r) => (
          <div key={r.pts} className="bg-slate-800 rounded-xl p-4">
            <p className={`text-2xl font-black ${r.color}`}>{r.pts}</p>
            <p className="font-semibold text-white mt-1">{r.label}</p>
            <p className="text-slate-400 text-sm mt-1">{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavBar() {
  const isLoggedIn = !!localStorage.getItem('token');
  const location = useLocation();
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`hover:text-blue-300 transition ${
        location.pathname === to ? 'text-blue-400 font-semibold' : ''
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-slate-800 p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-blue-400">
          WCPredictor
        </Link>
        <div className="space-x-5">
          {isLoggedIn ? (
            <>
              {navLink('/matches', 'Matchs')}
              {navLink('/stats', 'Stats')}
              {navLink('/leaderboard', 'Classement')}
              {navLink('/dashboard', 'Mon Tableau de Bord')}
              {user?.role === 'admin' && navLink('/admin', 'Admin')}
            </>
          ) : (
            <>
              {navLink('/login', 'Se connecter')}
              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition"
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-white font-sans">
        <NavBar />

        <main className="container mx-auto p-4 mt-6">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Home />} />

            <Route
              path="/matches"
              element={
                <ProtectedRoute>
                  <Matches />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <Leaderboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stats"
              element={
                <ProtectedRoute>
                  <Stats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
