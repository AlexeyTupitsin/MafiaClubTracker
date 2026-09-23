import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './hooks/useAuth';
import App from './App';
import './fonts.css';
import './index.css';

// После деплоя старые файлы страниц удаляются: открытая вкладка при переходе
// получит ошибку загрузки чанка. Перезагружаем страницу (не чаще раза в 10 с).
window.addEventListener('vite:preloadError', (event) => {
  const RELOAD_KEY = 'ironmaf-chunk-reload';
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage недоступен — перезагружаем без защиты от цикла
  }
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
