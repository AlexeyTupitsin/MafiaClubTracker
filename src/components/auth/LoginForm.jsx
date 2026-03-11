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
        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        autoFocus
      />
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        onKeyDown={(e) => e.key === 'Enter' && !loading && login && password && handleSubmit()}
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading || !login || !password}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg py-2 text-sm font-medium transition-colors"
      >
        {loading ? 'Вход...' : 'Войти'}
      </button>
    </div>
  );
}
