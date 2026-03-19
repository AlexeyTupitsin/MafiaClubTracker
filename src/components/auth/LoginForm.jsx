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
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-violet-500 outline-none"
        autoFocus
      />
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-violet-500 outline-none"
        onKeyDown={(e) => e.key === 'Enter' && !loading && login && password && handleSubmit()}
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading || !login || !password}
        className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg py-2 text-sm font-medium transition-colors"
      >
        {loading ? 'Вход...' : 'Войти'}
      </button>
    </div>
  );
}
