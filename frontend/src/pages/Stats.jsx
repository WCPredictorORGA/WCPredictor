import { useState, useEffect } from 'react';

const API = 'http://localhost:3000';

export default function Stats() {
  const [scorers, setScorers] = useState([]);
  const [standings, setStandings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/stats/scorers`).then((r) => r.json()),
      fetch(`${API}/api/stats/standings`).then((r) => r.json()),
    ])
      .then(([scorersData, standingsData]) => {
        setScorers(scorersData.scorers || []);

        // Regrouper les équipes par groupe
        const grouped = (standingsData.standings || []).reduce((acc, team) => {
          const g = team.group_letter || '?';
          if (!acc[g]) acc[g] = [];
          acc[g].push(team);
          return acc;
        }, {});
        setStandings(grouped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-slate-400 text-center mt-20">Chargement des statistiques…</p>;
  }

  const groups = Object.keys(standings).sort();

  return (
    <div className="max-w-5xl mx-auto mt-6 space-y-10">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-blue-400">Statistiques</h2>
        <p className="text-slate-400 mt-2">Buteurs et classements par groupe</p>
      </div>

      {/* Classements par groupe */}
      <section>
        <h3 className="text-xl font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2">
          Classements par groupe
        </h3>

        {groups.length === 0 ? (
          <p className="text-slate-500 text-center py-6">
            Les classements seront disponibles dès que des matchs seront terminés.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map((g) => (
              <div key={g} className="bg-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-700 px-4 py-2 font-bold text-slate-200">
                  Groupe {g}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase border-b border-slate-700">
                      <th className="px-4 py-2 text-left">Équipe</th>
                      <th className="px-3 py-2 text-center">J</th>
                      <th className="px-3 py-2 text-center">Pts</th>
                      <th className="px-3 py-2 text-center">BP</th>
                      <th className="px-3 py-2 text-center">BC</th>
                      <th className="px-3 py-2 text-center">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings[g].map((team, i) => (
                      <tr
                        key={team.code}
                        className={`border-b border-slate-700/50 ${
                          i < 2 ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        <td className="px-4 py-2 font-medium flex items-center gap-2">
                          {i < 2 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                          )}
                          {team.team}
                          <span className="text-slate-500 text-xs">{team.code}</span>
                        </td>
                        <td className="px-3 py-2 text-center">{team.played}</td>
                        <td className="px-3 py-2 text-center font-bold text-blue-400">
                          {team.points}
                        </td>
                        <td className="px-3 py-2 text-center">{team.goals_for}</td>
                        <td className="px-3 py-2 text-center">{team.goals_against}</td>
                        <td className="px-3 py-2 text-center">
                          {team.goal_diff > 0 ? `+${team.goal_diff}` : team.goal_diff}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top buteurs */}
      <section>
        <h3 className="text-xl font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2">
          Top buteurs
        </h3>

        {scorers.length === 0 ? (
          <p className="text-slate-500 text-center py-6">Aucune statistique disponible pour l'instant.</p>
        ) : (
          <div className="bg-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase border-b border-slate-700 bg-slate-900">
                  <th className="px-4 py-3 text-center w-12">#</th>
                  <th className="px-4 py-3 text-left">Joueur</th>
                  <th className="px-4 py-3 text-left">Équipe</th>
                  <th className="px-4 py-3 text-center">Buts</th>
                  <th className="px-4 py-3 text-center">Passes D.</th>
                </tr>
              </thead>
              <tbody>
                {scorers.map((s, i) => (
                  <tr
                    key={`${s.player}-${s.code}`}
                    className="border-b border-slate-700/50 hover:bg-slate-700 transition"
                  >
                    <td className="px-4 py-3 text-center font-bold text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-white">{s.player}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {s.team}{' '}
                      <span className="text-slate-500 text-xs">{s.code}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-blue-400 text-lg">
                      {s.goals}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400">{s.assists}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
