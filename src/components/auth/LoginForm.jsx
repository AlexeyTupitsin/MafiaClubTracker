import { useRef, useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Field, Input, Button, FormStatus, useFocusFirstError } from '../ui';

export function LoginForm({ onClose }) {
  const { signIn } = useAuth();
  const formRef = useRef(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useFocusFirstError(formRef, attempt);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!login.trim()) next.login = 'Введите логин';
    if (!password) next.password = 'Введите пароль';
    setErrors(next);
    setFailure('');
    if (Object.keys(next).length) { setAttempt((n) => n + 1); return; }

    setLoading(true);
    const { error } = await signIn(login.trim(), password);
    setLoading(false);
    if (error) {
      // Пароль стираем, логин оставляем — чаще ошибаются в пароле
      setPassword('');
      setFailure('Логин или пароль не подходят. Проверьте раскладку и Caps Lock.');
    } else {
      onClose();
    }
  };

  const clear = (key) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field label="Логин" error={errors.login}>
        <Input
          type="text"
          value={login}
          onChange={(e) => { setLogin(e.target.value); clear('login'); }}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
        />
      </Field>
      <Field label="Пароль" error={errors.password}>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); clear('password'); }}
            autoComplete="current-password"
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            aria-pressed={showPassword}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-200 cursor-pointer"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </Field>
      {failure && <FormStatus>{failure}</FormStatus>}
      <Button type="submit" loading={loading} icon={LogIn} className="w-full">
        {loading ? 'Входим…' : 'Войти'}
      </Button>
      <p className="text-[13px] text-stone-500 text-center">
        Вход нужен только ведущим — смотреть рейтинг и игры можно без него.
      </p>
    </form>
  );
}
