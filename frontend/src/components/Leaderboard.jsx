import { useState, useEffect } from 'react';

export default function Leaderboard() {
  // 1. Les fausses données (Mock Data) en attendant le vrai Backend
  const mockLeaderboard = [
    { id: 1, rank: 1, username: "ZinédineZ", points: 125, exact: 5, partial: 10 },
    { id: 2, rank: 2, username: "KylianM", points: 110, exact: 3, partial: 12 },
    { id: 3, rank: 3, username: "TonPseudo", points: 95, exact: 2, partial: 9 },
    { id: 4, rank: 4, username: "DidierD", points: 80, exact: 1, partial: 11 },
    { id: 5, rank: 5, username: "NeymarJr", points: 45, exact: 0, partial: 5 },
  ];

  const [leaderboard, setLeaderboard] = useState([]);

  // 2. Chargement des données au démarrage du composant
  useEffect(() => {
    // Plus tard, on remplacera la ligne ci-dessous par un "fetch('/api/leaderboard')"
    setLeaderboard(mockLeaderboard);
  }, []);

  // 3. Petite fonction utilitaire pour colorer le podium (Or, Argent, Bronze)
  const getRankBadge = (rank) => {
    if (rank === 1) return "bg-yellow-500 text-yellow-900 shadow-lg shadow-yellow-500/20";
    if (rank === 2) return "bg-gray-300 text-gray-800 shadow-lg shadow-gray-400/20";
    if (rank === 3) return "bg-amber-700 text-white shadow-lg shadow-amber-700/20";
    return "bg-slate-700 text-slate-300"; // Pour tous les autres
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-slate-800 rounded-lg shadow-xl text-white">
      
      <div className="mb-8 border-b border-slate-700 pb-4 text-center">
        <h2 className="text-3xl font-bold text-blue-400">Classement Général</h2>
        <p className="text-slate-400 mt-2">Mesurez-vous aux autres pronostiqueurs !</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-700 text-slate-400 text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold text-center w-16">Rang</th>
              <th className="p-4 font-semibold">Joueur</th>
              <th className="p-4 font-semibold text-center w-24">Points</th>
              <th className="p-4 font-semibold text-center hidden md:table-cell w-32">Scores Exacts</th>
              <th className="p-4 font-semibold text-center hidden md:table-cell w-32">Bons Gagnants</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player) => (
              <tr 
                key={player.id} 
                className="border-b border-slate-700/50 hover:bg-slate-700 transition duration-150"
              >
                <td className="p-4 text-center font-bold">
                  <span className={`inline-block w-8 h-8 leading-8 rounded-full text-sm ${getRankBadge(player.rank)}`}>
                    {player.rank}
                  </span>
                </td>
                <td className="p-4 font-medium text-lg">{player.username}</td>
                <td className="p-4 text-center font-bold text-blue-400 text-xl">{player.points}</td>
                <td className="p-4 text-center text-slate-400 hidden md:table-cell">{player.exact}</td>
                <td className="p-4 text-center text-slate-400 hidden md:table-cell">{player.partial}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}