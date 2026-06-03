# Mafia Club Tracker

Веб-приложение для учёта игр в спортивную мафию. Сезоны, турниры, рейтинг, статистика игроков, аватары. UI на русском.

**Стек:** Vite + React 19 + Tailwind v4 + Supabase (PostgreSQL + Auth + Storage). Деплоится на Vercel.

## Команды

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production-сборка в dist/
npm run preview  # локальный preview production-сборки
```

## Переменные окружения

Скопировать `.env.example` в `.env.local` и заполнить. Обязательны: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLUB_NAME`, `VITE_CLUB_CITY`. Логотип и иконки — файлы в `public/` (`logo.jpg`, `icon-192.png`, `icon-512.png`).

## Развернуть для своего клуба

Полная инструкция (Supabase + Vercel, без программирования): [docs/DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md).

После клонирования владельцу репо стоит включить **Settings → Template repository** на GitHub — тогда другие клубы смогут разворачивать копии через кнопку "Use this template".

## Для разработчиков

Архитектура, известные нюансы (в частности — почему data layer работает через прямой REST, а не через `supabase-js`), доменная модель: см. [CLAUDE.md](CLAUDE.md).
