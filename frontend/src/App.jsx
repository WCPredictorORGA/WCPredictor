import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import ProtectedRoute from './components/ProtectedRoute';
import Matches from './pages/Matches';
import Stats from './pages/Stats';
import Admin from './pages/Admin';

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
            <Route
              path="/"
              element={
                <div className="text-center mt-20">
                  <h2 className="text-3xl font-bold mb-4">Bienvenue sur WCPredictor</h2>
                  <p className="text-slate-400">
                    Veuillez vous connecter pour commencer à pronostiquer.
                  </p>
                </div>
              }
            />

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
