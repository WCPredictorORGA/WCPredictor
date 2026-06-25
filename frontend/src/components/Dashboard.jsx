import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API, authFetch } from '../config.js';
import { useLang } from '../LanguageContext.jsx';

const badgeClass = (pts) => {
  if (pts === 3) return 'badge-exact';
  if (pts === 1) return 'badge-correct';
  if (pts === 0) return 'badge-wrong';
  return 'badge-pending';
};

const badgeLabel = (p) => {
  if (p.points_awarded != null) return `${p.points_awarded} pt${p.points_awarded !== 1 ? 's' : ''}`;
  if (p.status === 'scheduled') return 'À venir';
  return '–';
};

export default function Dashboard() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return { username: 'Joueur' }; } })();
  const { t } = useLang();

  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`${API}/api/predictions`)
      .then((r) => r.json())
      .then((d) => setPredictions(d.predictions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await authFetch(`${API}/api/auth/logout`, { method: 'POST' }).catch(() => {});
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  const totalPoints = predictions.reduce((s, p) => s + (p.points_awarded ?? 0), 0);
  const exact   = predictions.filter((p) => p.points_awarded === 3).length;
  const partial = predictions.filter((p) => p.points_awarded === 1).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="card p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{t('dashboard.title')}</h2>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('dashboard.connected_as')} <span style={{ color: 'var(--accent)' }} className="font-bold">{user.username}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/matches" state={{ statusFilter: 'scheduled' }} className="btn btn-primary text-sm px-4 py-2">
            {t('dashboard.btn.predict')}
          </Link>
          <button onClick={handleLogout} className="btn btn-danger">
            {t('dashboard.btn.logout')}
          </button>
        </div>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { val: totalPoints, label: t('dashboard.stat.points'),  color: 'var(--accent)' },
          { val: exact,       label: t('dashboard.stat.exact'),   color: '#F5B705' },
          { val: partial,     label: t('dashboard.stat.partial'), color: '#22c55e' },
        ].map((s) => (
          <div key={s.label} className="card p-5 text-center">
            <p className="text-4xl font-black" style={{ color: s.color }}>{s.val}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pronostics */}
      <div className="card p-6">
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>{t('dashboard.predictions.title')}</h3>

        {loading && (
          <p className="text-center py-10" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
        )}

        {!loading && predictions.length === 0 && (
          <div className="text-center py-10">
            <p style={{ color: 'var(--text-muted)' }}>{t('dashboard.predictions.empty')}</p>
            <Link to="/matches" state={{ statusFilter: 'scheduled' }} className="btn btn-primary inline-flex mt-5 px-6 py-2">
              {t('dashboard.predictions.cta')}
            </Link>
          </div>
        )}

        {!loading && predictions.length > 0 && (
          <div className="space-y-2">
            {predictions.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div className="flex-1 flex items-center gap-2 min-w-0 text-sm">
                  <span className="font-semibold truncate" style={{ color: 'var(--text)' }}>{p.home_team}</span>
                  <span style={{ color: 'var(--text-muted)' }}>vs</span>
                  <span className="font-semibold truncate" style={{ color: 'var(--text)' }}>{p.away_team}</span>
                </div>

                <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {t('dashboard.pred.label')} <strong style={{ color: 'var(--accent)' }}>{p.pred_home}–{p.pred_away}</strong>
                </span>

                {p.status === 'finished' && (
                  <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {t('dashboard.result.label')} <strong style={{ color: 'var(--text)' }}>{p.home_score}–{p.away_score}</strong>
                  </span>
                )}

                <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${badgeClass(p.points_awarded)}`}>
                  {badgeLabel(p)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
