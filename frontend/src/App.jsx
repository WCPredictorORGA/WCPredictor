import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Leaderboard from './pages/Leaderboard';

function App() {
  return (
    <Router>
      {/* Barre de navigation */}
      <nav className="bg-gray-800 text-white p-4 shadow-md">
        <div className="container mx-auto flex gap-6">
          <Link to="/" className="hover:text-blue-300 font-semibold">Accueil</Link>
          <Link to="/leaderboard" className="hover:text-blue-300 font-semibold">Classement</Link>
          <Link to="/login" className="hover:text-blue-300 font-semibold ml-auto">Connexion</Link>
        </div>
      </nav>

      {/* Zone où les pages s'affichent */}
      <main className="container mx-auto mt-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;