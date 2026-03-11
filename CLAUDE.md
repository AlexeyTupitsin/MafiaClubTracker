# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mafia Club Tracker — веб-приложение для учёта игр в спортивную мафию. Мигрируется с Claude Artifact на standalone Vite + React + Supabase приложение. Весь UI на русском языке.

## Commands

```bash
npm run dev      # Dev server на http://localhost:5173
npm run build    # Production сборка в dist/
npm run preview  # Preview production build
```

## Key Documents

- `MAFIA_TRACKER_IMPLEMENTATION.md` — полная спецификация: модели данных, бизнес-логика, экраны, метрики
- `MAFIA_TRACKER_STAGES.md` — поэтапный план разработки (8 этапов)
- `MAFIA_TRACKER_MIGRATION.md` — план миграции на Supabase + Vercel
- `sql/` — SQL скрипты для Supabase (схема, индексы, VIEW, RLS)

## Tech Stack

- **Vite** — сборка и dev server
- **React 19** (hooks: useState, useEffect, useMemo, useCallback)
- **Tailwind CSS v4** через `@tailwindcss/vite` плагин
- **Recharts** — графики (LineChart, BarChart)
- **lucide-react** — иконки
- **@supabase/supabase-js** — установлен, пока placeholder (Stage 2)

## Storage Layer

Текущий слой: `src/lib/storage.js` — localStorage-обёртка с async API и префиксом `mafia:`.

```javascript
import { safeGet, safeSet, safeDelete } from "./lib/storage";
const data = await safeGet("key", fallback);
await safeSet("key", data);
await safeDelete("key");
```

Ключи: `seasons`, `players`, `games:SEASON_ID`. При миграции на Supabase заменится на `src/lib/queries.js`.

## Project Structure

```
src/
├── lib/           constants, utils, metrics, storage, supabase
├── components/
│   ├── ui/        Modal, Badge, StatCard, EmptyState, ConfirmDialog, Toast
│   ├── layout/    Header, TabBar
│   └── auth/      LoginForm, AuthGuard (заглушки)
├── pages/         Dashboard, GameList, GameDetail, GameForm, Leaderboard,
│                  PlayerList, PlayerProfile, PlayerCompare, Settings
├── hooks/         (пусто, для Stage 2)
├── App.jsx        State management, routing, layout
├── main.jsx       Entry point
└── index.css      Tailwind import
```

## Navigation

State-based навигация (без react-router): `navigate(page, id)` через useState. Страницы:
`dashboard` | `games` | `gameDetail` | `gameForm` | `rating` | `players` | `playerProfile` | `compare` | `settings`

## Domain Model

Спортивная мафия: 10 игроков за столом. Роли: `citizen` x6, `sheriff` x1, `mafia` x2, `don` x1. Команды: `red` (citizen+sheriff), `black` (mafia+don). Победа = 1 балл + бонусные баллы от ведущего.

## Key Validation Rules

- Игра: ровно 10 уникальных игроков, места 1-10, состав ролей 6+2+1+1
- Ник: обязательный, уникальный (case-insensitive)
- Удаление игрока — только деактивация (если есть игры)
- Один активный сезон, новые игры только в активный сезон
- Удаление сезона только если 0 игр
