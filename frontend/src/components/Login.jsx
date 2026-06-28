import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API, authFetch } from '../config.js';
import { useLang } from '../LanguageContext.jsx';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState({ text: '', isError: false });
  const navigate = useNavigate();
  const { t } = useLang();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', isError: false });
    try {
      const response = await authFetch(`${API}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Identifiants incorrects.');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/matches');
      window.location.reload();
    } catch (err) {
      setMessage({ text: err.message, isError: true });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="card p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{t('login.title')}</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('login.no_account')}{' '}
            <Link to="/register" style={{ color: 'var(--accent)' }} className="font-semibold hover:underline">
              {t('login.link_register')}
            </Link>
          </p>
        </div>

        {message.text && (
          <div className={`px-4 py-3 rounded-lg text-sm mb-6 font-medium ${
            message.isError
              ? 'bg-red-500/15 border border-red-500/40 text-red-400'
              : 'bg-green-500/15 border border-green-500/40 text-green-400'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
              {t('login.email')}
            </label>
            <input
              type="email"
              required
              className="form-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
              {t('login.password')}
            </label>
            <input
              type="password"
              required
              className="form-input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary w-full py-2.5 mt-2">
            {t('login.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
