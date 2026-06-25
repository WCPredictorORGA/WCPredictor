import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, authFetch } from '../config.js';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState({ text: '', isError: false });
  const navigate = useNavigate();

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

      // Stocke uniquement les infos d'affichage (pas le token — il est dans le cookie httpOnly)
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate('/matches');
      window.location.reload();
    } catch (err) {
      setMessage({ text: err.message, isError: true });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-slate-800 rounded-lg shadow-xl text-white">
      <h2 className="text-2xl font-bold mb-6 text-center">Se connecter</h2>

      {message.text && (
        <div className={`p-3 rounded mb-4 text-sm ${message.isError ? 'bg-red-600' : 'bg-green-600'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Adresse Email</label>
          <input
            type="email"
            required
            className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-blue-500 text-white"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mot de passe</label>
          <input
            type="password"
            required
            className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-blue-500 text-white"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>
        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 p-2 rounded font-bold transition">
          Se connecter
        </button>
      </form>
    </div>
  );
}
