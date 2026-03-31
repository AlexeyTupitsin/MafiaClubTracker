import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export function LoginForm({ onClose }) {
  const { signIn } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    const { error } = await signIn(login, password);
    setLoading(false);
    if (error) {
      setError('Неверный логин или пароль');
    } else {
      onClose();
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Логин"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        autoComplete="username"
        className="w-full bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 outline-none"
        autoFocus
      />
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        className="w-full bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 outline-none"
        onKeyDown={(e) => e.key === 'Enter' && !loading && login && password && handleSubmit()}
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading || !login || !password}
        className="w-full btn-gradient disabled:opacity-50 disabled:cursor-not-allowed py-2 text-sm font-medium cursor-pointer"
      >
        {loading ? 'Вход...' : 'Войти'}
      </button>
    </div>
  );
}
