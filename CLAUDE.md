# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mafia Club Tracker — веб-приложение для учёта игр в спортивную мафию. Реализуется как **один React-артефакт (.jsx)** для запуска в Claude Artifacts. Весь UI на русском языке.

## Key Documents

- `MAFIA_TRACKER_IMPLEMENTATION.md` — полная спецификация: модели данных, бизнес-логика, экраны, метрики, валидация
- `MAFIA_TRACKER_STAGES.md` — поэтапный план разработки (7 этапов, каждый даёт рабочее приложение)

## Tech Stack & Constraints

- **Один файл .jsx** — весь код в одном файле, без сборки
- **React** (hooks: useState, useEffect, useMemo, useCallback) — без react-router, навигация через useState
- **Tailwind CSS** — только core utility classes (без компилятора)
- **Recharts** — графики (LineChart, BarChart)
- **lucide-react** — иконки
- **lodash** — утилиты
- **Хранилище:** `window.storage` API (Persistent Storage Claude Artifacts), **не** localStorage/sessionStorage
- Нет build/test/lint команд — файл используется как Claude Artifact

## Storage API

Все операции с `shared: true`. Ключи: `seasons`, `players`, `games:SEASON_ID`.

```javascript
// Чтение — бросает исключение для несуществующего ключа, не null
const result = await window.storage.get("key", true);
const data = result ? JSON.parse(result.value) : [];

// Запись
await window.storage.set("key", JSON.stringify(data), true);
```

Ограничения: макс. 5 МБ/ключ, ключи без пробелов/кавычек/слешей, все операции async + try/catch.

## Domain Model

Спортивная мафия: 10 игроков за столом. Роли: `citizen` ×6, `sheriff` ×1, `mafia` ×2, `don` ×1. Команды: `red` (citizen+sheriff), `black` (mafia+don). Победа = 1 балл, поражение = 0, плюс бонусные баллы (положительные/отрицательные) от ведущего.

```javascript
const getTeam = (role) => (role === "citizen" || role === "sheriff") ? "red" : "black";
```

## Code Structure (within single .jsx)

1. Константы (ROLE_NAMES, TEAM_NAMES, цвета)
2. Утилиты (generateId, getTeam, safeGet, safeSet)
3. Функции метрик (calcPlayerStats, calcRoleStats, calcPairStats, calcSeasonStats)
4. Переиспользуемые компоненты (Modal, Badge, StatCard, EmptyState, ConfirmDialog)
5. Компоненты страниц (Dashboard, GameList, GameForm, GameDetail, Leaderboard, PlayerList, PlayerProfile, Settings)
6. Главный компонент App (state, навигация, layout)
7. `export default App`

## Key Validation Rules

- Игра: ровно 10 уникальных игроков, уникальные места 1–10, состав ролей 6+2+1+1
- Ник игрока: обязательный, уникальный (case-insensitive)
- Удаление игрока невозможно при наличии игр — только деактивация
- Один активный сезон, новые игры только в активный сезон
- Удаление сезона только если 0 игр

## Navigation Pages

`dashboard` | `games` | `gameDetail` | `gameForm` | `rating` | `players` | `playerProfile` | `settings`

Навигация через `navigate(page, id)` — обёртка над `setCurrentPage` + `setSelectedId`.

## Development Workflow

Разработка ведётся поэтапно (7 этапов из `MAFIA_TRACKER_STAGES.md`). Каждый этап обновляет единый .jsx файл, не ломая предыдущий функционал. При первом запуске без данных автоматически создаётся «Сезон 1».
