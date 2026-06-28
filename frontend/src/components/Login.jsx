import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API, authFetch } from '../config.js';
import { useLang } from '../LanguageContext.jsx';

const PASSWORD_RULES = [
  { label: '8 caractères minimum', test: (p) => p.length >= 8 },
  { label: 'Au moins une majuscule', test: (p) => /[A-Z]/.test(p) },
  { label: 'Au moins une minuscule', test: (p) => /[a-z]/.test(p) },
  { label: 'Au moins un chiffre',    test: (p) => /[0-9]/.test(p) },
];

const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    )}
  </svg>
);

function Flash({ msg }) {
  if (!msg?.text) return null;
  return (
    <div className={`px-4 py-3 rounded-lg text-sm mb-6 font-medium ${
      msg.isError
        ? 'bg-red-500/15 border border-red-500/40 text-red-400'
        : 'bg-green-500/15 border border-green-500/40 text-green-400'
    }`}>
      {msg.text}
    </div>
  );
}

export default function Login() {
  const navigate  = useNavigate();
  const { t }     = useLang();

  // step 0 = formulaire de connexion
  // step 1 = vérification identité (username + email)
  // step 2 = nouveau mot de passe
  const [step, setStep] = useState(0);

  // ── état formulaire de connexion ──────────────────────────────────────────
  const [loginData, setLoginData]       = useState({ email: '', password: '' });
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginMsg, setLoginMsg]         = useState(null);

  // ── état flux "mot de passe oublié" ──────────────────────────────────────
  const [resetUser, setResetUser]       = useState('');
  const [resetEmail, setResetEmail]     = useState('');
  const [newPwd, setNewPwd]             = useState('');
  const [showNewPwd, setShowNewPwd]     = useState(false);
  const [resetMsg, setResetMsg]         = useState(null);
  const [saving, setSaving]             = useState(false);

  // ── Connexion ─────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMsg(null);
    try {
      const res  = await authFetch(`${API}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Identifiants incorrects.');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/matches');
      window.location.reload();
    } catch (err) {
      setLoginMsg({ text: err.message, isError: true });
    }
  };

  // ── Étape 1 : vérification username + email ───────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault();
    setSaving(true);
    setResetMsg(null);
    try {
      const res  = await fetch(`${API}/api/auth/verify-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resetUser, email: resetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de vérification');
      setStep(2);
    } catch (err) {
      setResetMsg({ text: err.message, isError: true });
    } finally {
      setSaving(false);
    }
  };

  // ── Étape 2 : réinitialisation du mot de passe ───────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    setSaving(true);
    setResetMsg(null);
    try {
      const res  = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resetUser, email: resetEmail, new_password: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la réinitialisation');
      setResetMsg({ text: t('forgot.success'), isError: false });
      // Retour au formulaire de connexion après 2 s
      setTimeout(() => {
        setStep(0);
        setResetUser('');
        setResetEmail('');
        setNewPwd('');
        setResetMsg(null);
      }, 2000);
    } catch (err) {
      setResetMsg({ text: err.message, isError: true });
    } finally {
      setSaving(false);
    }
  };

  const backToLogin = () => {
    setStep(0);
    setResetMsg(null);
    setResetUser('');
    setResetEmail('');
    setNewPwd('');
  };

  const rulesOk = PASSWORD_RULES.every(({ test }) => test(newPwd));

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="card p-8">

        {/* ── STEP 0 : Connexion ── */}
        {step === 0 && (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{t('login.title')}</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {t('login.no_account')}{' '}
                <Link to="/register" style={{ color: 'var(--accent)' }} className="font-semibold hover:underline">
                  {t('login.link_register')}
                </Link>
              </p>
            </div>

            <Flash msg={loginMsg} />

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  {t('login.email')}
                </label>
                <input
                  type="email"
                  required
                  className="form-input"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    type={showLoginPwd ? 'text' : 'password'}
                    required
                    className="form-input pr-11"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    tabIndex={-1}
                    aria-label={showLoginPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    <EyeIcon open={showLoginPwd} />
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full py-2.5 mt-2">
                {t('login.submit')}
              </button>
            </form>

            <div className="text-center mt-5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm hover:underline transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('login.forgot')}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 1 : Vérification d'identité ── */}
        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{t('forgot.step1.title')}</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t('forgot.step1.subtitle')}</p>
            </div>

            <Flash msg={resetMsg} />

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  {t('forgot.step1.username')}
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={resetUser}
                  onChange={(e) => setResetUser(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  {t('forgot.step1.email')}
                </label>
                <input
                  type="email"
                  required
                  className="form-input"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <button type="submit" disabled={saving} className="btn btn-primary w-full py-2.5">
                {saving ? '…' : t('forgot.step1.submit')}
              </button>
            </form>

            <div className="text-center mt-5">
              <button type="button" onClick={backToLogin}
                className="text-sm hover:underline" style={{ color: 'var(--text-muted)' }}>
                ← {t('login.back')}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2 : Nouveau mot de passe ── */}
        {step === 2 && (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{t('forgot.step2.title')}</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t('forgot.step2.subtitle')}</p>
            </div>

            <Flash msg={resetMsg} />

            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  {t('forgot.step2.new_password')}
                </label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    required
                    className="form-input pr-11"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    tabIndex={-1}
                  >
                    <EyeIcon open={showNewPwd} />
                  </button>
                </div>
                {newPwd.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {PASSWORD_RULES.map(({ label, test }) => {
                      const ok = test(newPwd);
                      return (
                        <li key={label} className="flex items-center gap-1.5 text-xs"
                          style={{ color: ok ? 'var(--accent)' : 'var(--text-muted)' }}>
                          <span>{ok ? '✓' : '·'}</span>
                          {label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <button type="submit" disabled={saving || !rulesOk} className="btn btn-primary w-full py-2.5">
                {saving ? '…' : t('forgot.step2.submit')}
              </button>
            </form>

            <div className="text-center mt-5">
              <button type="button" onClick={backToLogin}
                className="text-sm hover:underline" style={{ color: 'var(--text-muted)' }}>
                ← {t('login.back')}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
