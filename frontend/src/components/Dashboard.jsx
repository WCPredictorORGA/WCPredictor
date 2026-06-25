import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API = 'http://localhost:3000';

export default function Dashboard() {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { username: 'Joueur' };
  const token = localStorage.getItem('token');

  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/predictions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setPredictions(data.predictions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  const totalPoints = predictions.reduce((sum, p) => sum + (p.points_awarded ?? 0), 0);
  const exact = predictions.filter((p) => p.points_awarded === 3).length;
  const partial = predictions.filter((p) => p.points_awarded === 1).length;

  const pointsBadge = (pts) => {
    if (pts === 3) return 'bg-yellow-600 text-yellow-100';
    if (pts === 1) return 'bg-green-700 text-green-100';
    if (pts === 0) return 'bg-red-800 text-red-200';
    return 'bg-slate-600 text-slate-400';
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-slate-800 rounded-lg shadow-xl text-white">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-3xl font-bold">Tableau de Bord</h2>
          <p className="text-slate-400 mt-1">
            Bienvenue, <span className="text-blue-400 font-bold">{user.username}</span> !
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-bold transition"
        >
          Se déconnecter
        </button>
      </div>

      {/* Statistiques récapitulatives */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-700 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{totalPoints}</p>
          <p className="text-slate-400 text-sm mt-1">Points totaux</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{exact}</p>
          <p className="text-slate-400 text-sm mt-1">Scores exacts</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{partial}</p>
          <p className="text-slate-400 text-sm mt-1">Bons résultats</p>
        </div>
      </div>

      {/* Liste des pronostics */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Mes pronostics</h3>
          <Link
            to="/matches"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-bold transition"
          >
            + Ajouter des pronostics
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-400 text-center py-8">Chargement…</p>
        ) : predictions.length === 0 ? (
          <div className="bg-slate-700 p-6 rounded text-center">
            <p className="text-slate-300">Vous n'avez encore fait aucun pronostic.</p>
            <Link
              to="/matches"
              className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-bold transition"
            >
              Pronostiquer maintenant
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {predictions.map((p) => (
              <div
                key={p.id}
                className="bg-slate-700 rounded px-4 py-3 flex items-center gap-4"
              >
                {/* Équipes */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <span className="font-medium text-white truncate">{p.home_team}</span>
                  <span className="text-slate-400 text-sm shrink-0">vs</span>
                  <span className="font-medium text-white truncate">{p.away_team}</span>
                </div>

                {/* Pronostic */}
                <span className="text-sm text-slate-300 shrink-0">
                  Pronostic : <span className="font-bold text-white">{p.pred_home}–{p.pred_away}</span>
                </span>

                {/* Résultat officiel (si terminé) */}
                {p.status === 'finished' && (
                  <span className="text-sm text-slate-400 shrink-0">
                    Résultat : <span className="font-bold text-white">{p.home_score}–{p.away_score}</span>
                  </span>
                )}

                {/* Points */}
                <span
                  className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${pointsBadge(p.points_awarded)}`}
                >
                  {p.points_awarded != null
                    ? `${p.points_awarded} pt${p.points_awarded !== 1 ? 's' : ''}`
                    : p.status === 'scheduled'
                    ? 'À jouer'
                    : '–'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
