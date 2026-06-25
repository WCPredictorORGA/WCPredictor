import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  // On vérifie si l'utilisateur est connecté pour adapter le menu
  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-white font-sans">
        
        <nav className="bg-slate-800 p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="text-xl font-bold text-blue-400">WCPredictor</Link>
            
            <div className="space-x-4">
              {isLoggedIn ? (
                // Menu affiché si connecté
                <>
                  <Link to="/leaderboard" className="hover:text-blue-300 transition">Classement</Link>
                  <Link to="/dashboard" className="hover:text-blue-300 transition">Mon Tableau de Bord</Link>
                </>
              ) : (
                // Menu affiché si déconnecté
                <>
                  <Link to="/login" className="hover:text-blue-300 transition">Se connecter</Link>
                  <Link to="/register" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition">S'inscrire</Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4 mt-8">
          <Routes>
            {/* Routes publiques */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={
              <div className="text-center mt-20">
                <h2 className="text-3xl font-bold mb-4">Bienvenue sur WCPredictor</h2>
                <p className="text-slate-400">Veuillez vous connecter pour commencer à pronostiquer.</p>
              </div>
            } />

            {/* Route PROTÉGÉE */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/leaderboard" element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            } />
          </Routes>
        </main>

      </div>
    </Router>
  );
}