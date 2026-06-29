import { useState, useEffect } from 'react';
import { API } from '../config.js';
import { useLang } from '../LanguageContext.jsx';

const BOT_NAME = 'Botnaru';
const BOT_COLOR = '#a78bfa'; // violet IA

const PODIUM = [
  { rank: 2, medal: '🥈', color: '#7C7C94', height: 88,  avatarSize: 50, fontSize: 18 },
  { rank: 1, medal: '🥇', color: '#C8A02A', height: 120, avatarSize: 62, fontSize: 24 },
  { rank: 3, medal: '🥉', color: '#A0624A', height: 64,  avatarSize: 50, fontSize: 18 },
];

/** Badge violet "🤖 IA" affiché à côté du nom de Botnaru */
function BotBadge() {
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 5,
      background: 'rgba(167,139,250,0.18)', color: BOT_COLOR,
      border: '1px solid rgba(167,139,250,0.4)', flexShrink: 0,
      letterSpacing: '.03em',
    }}>
      🤖 IA
    </span>
  );
}

/** Avatar — image pixel art pour Botnaru, initiale pour les humains */
function Avatar({ username, size, borderColor }) {
  const isBot = username === BOT_NAME;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2.5px solid ${isBot ? BOT_COLOR : borderColor}`,
      boxShadow: isBot ? `0 0 14px rgba(167,139,250,0.45)` : 'none',
      overflow: 'hidden', flexShrink: 0,
      background: isBot ? 'rgba(167,139,250,0.1)' : `${borderColor}22`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {isBot
        ? <img src="/botnaru.png" alt="Botnaru" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        : <span style={{ fontWeight: 900, fontSize: size * 0.4, color: borderColor }}>{username.charAt(0).toUpperCase()}</span>
      }
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

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

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

      {loading && (
        <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
      )}
      {error && <p className="text-center py-12 text-red-400">{error}</p>}
      {!loading && !error && leaderboard.length === 0 && (
        <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('leaderboard.empty')}</p>
      )}

      {!loading && !error && leaderboard.length > 0 && (
        <>
          {/* ── Podium top 3 ── */}
          <div className="flex items-end justify-center gap-4 mb-10 px-4">
            {PODIUM.map((cfg, i) => {
              const row = top3[cfg.rank - 1];
              if (!row) return <div key={i} style={{ width: 110 }} />;
              const isMe  = currentUser && row.username === currentUser.username;
              const isBot = row.username === BOT_NAME;
              const podiumColor = isBot ? BOT_COLOR : cfg.color;

              return (
                <div key={row.user_id}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: cfg.rank === 1 ? 130 : 110 }}>
                  <Avatar username={row.username} size={cfg.avatarSize} borderColor={podiumColor} />
                  <div style={{ marginBottom: 3, height: 6 }} />
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: isBot ? BOT_COLOR : 'var(--text)', textAlign: 'center', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.username}
                  </p>
                  {isBot && (
                    <p style={{ margin: '0 0 4px', fontSize: 10, color: BOT_COLOR, fontWeight: 700, textAlign: 'center', opacity: 0.85 }}>
                      🤖 IA · Poisson
                    </p>
                  )}
                  {isMe && !isBot && (
                    <p style={{ margin: '0 0 4px', fontSize: 10, color: 'var(--accent)', fontWeight: 700, textAlign: 'center' }}>
                      {t('leaderboard.you')}
                    </p>
                  )}
                  <div style={{
                    width: '100%', height: cfg.height,
                    background: podiumColor, borderRadius: '10px 10px 0 0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    boxShadow: isBot ? `0 -4px 20px rgba(167,139,250,0.4)` : 'none',
                  }}>
                    {isBot
                      ? <img src="/botnaru.png" alt="Botnaru" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '2px solid rgba(255,255,255,0.6)' }} />
                      : <span style={{ fontSize: 22 }}>{cfg.medal}</span>
                    }
                    <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{row.total_points}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>pts</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Table rangs 4+ ── */}
          {rest.length > 0 && (
            <div className="card overflow-hidden">
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 80px 80px 80px 80px 100px', padding: '10px 18px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)' }}>
                <span style={{ textAlign: 'center' }}>{t('leaderboard.col.rank')}</span>
                <span>{t('leaderboard.col.player')}</span>
                <span style={{ textAlign: 'center' }}>{t('leaderboard.col.points')}</span>
                <span style={{ textAlign: 'center' }}>{t('leaderboard.col.correct')}</span>
                <span style={{ textAlign: 'center' }}>{t('leaderboard.col.exact')}</span>
                <span style={{ textAlign: 'center' }}>{t('leaderboard.col.scored')}</span>
                <span style={{ textAlign: 'center' }}>{t('leaderboard.col.precision')}</span>
              </div>
              {/* Rows */}
              {rest.map((row, i) => {
                const rank  = i + 4;
                const isMe  = currentUser && row.username === currentUser.username;
                const isBot = row.username === BOT_NAME;

                const rowBg = isBot
                  ? 'rgba(167,139,250,0.07)'
                  : isMe
                    ? 'rgba(217,119,6,0.09)'
                    : 'transparent';

                return (
                  <div key={row.user_id}
                    style={{ display: 'grid', gridTemplateColumns: '56px 1fr 80px 80px 80px 80px 100px', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--border)', background: rowBg, transition: 'background 0.15s' }}
                    onMouseEnter={(e) => { if (!isMe && !isBot) e.currentTarget.style.background = 'var(--bg-input)'; }}
                    onMouseLeave={(e) => { if (!isMe && !isBot) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, color: isBot ? BOT_COLOR : 'var(--text-muted)' }}>
                      {isBot ? '🤖' : rank}
                    </span>
                    <span style={{ fontWeight: isBot ? 800 : 600, color: isBot ? BOT_COLOR : 'var(--text)', display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.username}
                      </span>
                      {isBot && <BotBadge />}
                      {isMe && !isBot && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'var(--accent-glow)', color: 'var(--accent)', flexShrink: 0 }}>
                          {t('leaderboard.you')}
                        </span>
                      )}
                    </span>
                    <span style={{ textAlign: 'center', fontWeight: 900, fontSize: 18, color: isBot ? BOT_COLOR : 'var(--accent)' }}>{row.total_points}</span>
                    <span style={{ textAlign: 'center', color: 'var(--text)' }}>{row.bon_prono}</span>
                    <span style={{ textAlign: 'center', color: 'var(--text)' }}>{row.score_exact}</span>
                    <span style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{row.matchs_joues}</span>
                    <span style={{ textAlign: 'center', fontWeight: 700, color: Number(row.precision_pct) >= 50 ? (isBot ? BOT_COLOR : 'var(--accent)') : 'var(--text-muted)' }}>
                      {row.matchs_joues > 0 ? `${row.precision_pct}%` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
