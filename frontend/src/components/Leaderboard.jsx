import { useState, useEffect } from 'react';
import { API } from '../config.js';
import { useLang } from '../LanguageContext.jsx';

/* ── Médaille circulaire avec ruban ── */
const BADGE = {
  1: { outer: '#D97706', inner: '#FEF3C7', text: '#92400E' },
  2: { outer: '#7C3AED', inner: '#EDE9FE', text: '#4C1D95' },
  3: { outer: '#78716C', inner: '#F5F5F4', text: '#44403C' },
};

function MedalBadge({ rank }) {
  const c = BADGE[rank];
  if (!c) {
    return (
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>{rank}</span>
    );
  }
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${c.inner}, ${c.outer})`,
        border: `2px solid ${c.outer}`,
        boxShadow: `0 2px 8px ${c.outer}66`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: 12, color: c.text,
      }}>
        {rank}
      </div>
      <div style={{
        width: 10, height: 6, marginTop: -1,
        background: c.outer,
        clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 50% 70%, 0% 100%)',
      }} />
    </div>
  );
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();
  const { t } = useLang();

  useEffect(() => {
    fetch(`${API}/api/leaderboard`)
      .then((r) => { if (!r.ok) throw new Error('Erreur serveur'); return r.json(); })
      .then((d) => setLeaderboard(d.leaderboard || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black" style={{ color: 'var(--text)' }}>
          {t('leaderboard.title')}
        </h2>
        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
          {t('leaderboard.subtitle')}
        </p>
      </div>

      <div className="card overflow-hidden">
        {loading && (
          <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            {t('common.loading')}
          </p>
        )}
        {error && (
          <p className="text-center py-12 text-red-400">{error}</p>
        )}

        {!loading && !error && (
          <table className="w-full text-left">
            <thead>
              <tr
                className="text-xs font-bold uppercase tracking-wider"
                style={{
                  background: 'var(--bg-input)',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                <th className="px-3 py-3 text-center">{t('leaderboard.col.rank')}</th>
                <th className="px-3 py-3">{t('leaderboard.col.player')}</th>
                <th className="px-3 py-3 text-center">{t('leaderboard.col.points')}</th>
                <th className="px-3 py-3 text-center">{t('leaderboard.col.correct')}</th>
                <th className="px-3 py-3 text-center">{t('leaderboard.col.exact')}</th>
                <th className="px-3 py-3 text-center">{t('leaderboard.col.scored')}</th>
                <th className="px-3 py-3 text-center">{t('leaderboard.col.precision')}</th>
              </tr>
            </thead>

            <tbody>
              {leaderboard.map((row, i) => {
                const rank = i + 1;
                const isMe = currentUser && row.username === currentUser.username;
                return (
                  <tr
                    key={row.user_id}
                    className="border-b transition-all duration-150"
                    style={{
                      borderColor: 'var(--border)',
                      background: isMe ? 'rgba(217,119,6,0.09)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isMe) e.currentTarget.style.background = 'var(--bg-input)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isMe) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td className="px-3 py-4 text-center">
                      <div className="flex justify-center">
                        <MedalBadge rank={rank} />
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold" style={{ color: 'var(--text)' }}>
                          {row.username}
                        </span>
                        {isMe && (
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--accent)', color: '#000' }}
                          >
                            {t('leaderboard.you')}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-4 text-center font-black text-xl" style={{ color: 'var(--accent)' }}>
                      {row.total_points}
                    </td>

                    <td className="px-3 py-4 text-center" style={{ color: 'var(--text)' }}>
                      {row.bon_prono}
                    </td>

                    <td className="px-3 py-4 text-center" style={{ color: 'var(--text)' }}>
                      {row.score_exact}
                    </td>

                    <td className="px-3 py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                      {row.matchs_joues}
                    </td>

                    <td
                      className="px-3 py-4 text-center font-semibold"
                      style={{ color: Number(row.precision_pct) >= 50 ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      {row.matchs_joues > 0 ? `${row.precision_pct}%` : '—'}
                    </td>
                  </tr>
                );
              })}

              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    {t('leaderboard.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
