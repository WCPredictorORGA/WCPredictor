import { useState, useEffect } from 'react';

const API = 'http://localhost:3000';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/leaderboard`)
      .then((r) => {
        if (!r.ok) throw new Error('Erreur serveur');
        return r.json();
      })
      .then((data) => setLeaderboard(data.leaderboard || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const rankBadge = (rank) => {
    if (rank === 1) return 'bg-yellow-500 text-yellow-900 shadow-lg shadow-yellow-500/20';
    if (rank === 2) return 'bg-gray-300 text-gray-800 shadow-lg shadow-gray-400/20';
    if (rank === 3) return 'bg-amber-700 text-white shadow-lg shadow-amber-700/20';
    return 'bg-slate-700 text-slate-300';
  };

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-slate-800 rounded-lg shadow-xl text-white">
      <div className="mb-8 border-b border-slate-700 pb-4 text-center">
        <h2 className="text-3xl font-bold text-blue-400">Classement Général</h2>
        <p className="text-slate-400 mt-2">Mesurez-vous aux autres pronostiqueurs !</p>
      </div>

      {loading && (
        <p className="text-slate-400 text-center py-8">Chargement du classement…</p>
      )}

      {error && (
        <p className="text-red-400 text-center py-8">{error}</p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-700 text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold text-center w-16">Rang</th>
                <th className="p-4 font-semibold">Joueur</th>
                <th className="p-4 font-semibold text-center w-28">Points</th>
                <th className="p-4 font-semibold text-center hidden md:table-cell w-36">Matchs scorés</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, index) => {
                const rank = index + 1;
                const isMe = currentUser && row.username === currentUser.username;
                return (
                  <tr
                    key={row.user_id}
                    className={`border-b border-slate-700/50 transition duration-150 ${
                      isMe ? 'bg-blue-900/30 hover:bg-blue-900/40' : 'hover:bg-slate-700'
                    }`}
                  >
                    <td className="p-4 text-center font-bold">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${rankBadge(rank)}`}
                      >
                        {rank}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-lg">
                      {row.username}
                      {isMe && <span className="ml-2 text-xs text-blue-400 font-normal">(vous)</span>}
                    </td>
                    <td className="p-4 text-center font-bold text-blue-400 text-xl">
                      {row.total_points}
                    </td>
                    <td className="p-4 text-center text-slate-400 hidden md:table-cell">
                      {row.matches_scored}
                    </td>
                  </tr>
                );
              })}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-500">
                    Aucun pronostic enregistré pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
