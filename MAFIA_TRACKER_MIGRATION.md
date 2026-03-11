# Mafia Club Tracker — Миграция на самостоятельное веб-приложение

## Контекст

Текущее приложение работает как React-артефакт внутри Claude с Persistent Storage.
Ограничение: данные не синхронизируются между устройствами.

**Цель:** полноценное веб-приложение, доступное по ссылке с любого устройства.
30 человек смотрят статистику, 1-3 ведущих вносят данные.

---

## 1. Выбор стека

### 1.1. Итоговый стек

| Слой | Технология | Почему |
|------|-----------|--------|
| Фронтенд | React + Vite + Tailwind CSS | Уже написан, минимальные изменения |
| Хостинг фронта | Vercel (бесплатно) | Zero-config деплой из GitHub, бесплатный поддомен |
| База данных | Supabase PostgreSQL (бесплатно) | 500 МБ БД, REST API из коробки, Auth, Realtime |
| Авторизация | Supabase Auth (email + пароль) | Бесплатно до 50k MAU, встроено в Supabase |
| API | Supabase JS Client (без своего бэкенда) | Прямые запросы к БД через Row Level Security |

### 1.2. Бесплатные лимиты

| Сервис | Лимит | Хватит ли |
|--------|-------|-----------|
| Vercel Free | 100 ГБ bandwidth/мес, 1000 деплоев | С запасом для 30 чел |
| Supabase Free | 500 МБ БД, 1 ГБ storage, 50k MAU | ~10 000 игр ≈ 50 МБ, с запасом |
| Supabase Auth | 50 000 активных пользователей/мес | С запасом |
| Supabase Realtime | 200 одновременных подключений | С запасом |

### 1.3. Почему не Firebase

Supabase выигрывает для этого проекта:
- PostgreSQL (реляционная БД) идеально ложится на нашу модель данных
- Row Level Security — авторизация на уровне БД без бэкенда
- SQL-запросы для сложной аналитики (пары, рейтинги)
- Бесплатный tier щедрее для малых проектов
- Open source, можно мигрировать на свой PostgreSQL в будущем

---

## 2. Архитектура

```
┌─────────────────────────────────────────────┐
│                  Vercel                       │
│  ┌─────────────────────────────────────────┐ │
│  │     React SPA (Vite + Tailwind)         │ │
│  │     mafia-club-xxx.vercel.app           │ │
│  └──────────────┬──────────────────────────┘ │
└─────────────────┼───────────────────────────┘
                  │ Supabase JS Client
                  ▼
┌─────────────────────────────────────────────┐
│               Supabase                       │
│  ┌──────────┐ ┌──────┐ ┌────────────────┐  │
│  │PostgreSQL│ │ Auth │ │ Row Level      │  │
│  │  5 таблиц│ │      │ │ Security (RLS) │  │
│  └──────────┘ └──────┘ └────────────────┘  │
└─────────────────────────────────────────────┘
```

### 2.1. Роли пользователей

| Роль | Кто | Что может |
|------|-----|-----------|
| `admin` | Ведущие (1-3 чел) | Всё: создание игр, игроков, сезонов, редактирование, удаление |
| `viewer` | Анонимные по ссылке | Только чтение: дашборд, рейтинг, профили, статистика |

**Реализация:**
- Ведущие вводят **только логин и пароль** (без email)
- Под капотом используется Supabase Auth с техническим email (пользователь его не видит)
- Для каждого ведущего создаётся аккаунт вида `{login}@mafia.local` — это внутренний трюк для Supabase
- В UI ведущий видит только два поля: «Логин» и «Пароль»
- В таблице `profiles` у них `role = 'admin'`
- Анонимные пользователи (без логина) видят всё, но не могут редактировать
- RLS-политики в PostgreSQL контролируют доступ на уровне БД

---

## 3. Схема базы данных (PostgreSQL)

### 3.1. Таблицы

```sql
-- Профили пользователей (ведущие)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  login TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Сезоны
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Игроки
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL UNIQUE,
  real_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Игры
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  game_number INT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  winner TEXT NOT NULL CHECK (winner IN ('red', 'black')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, game_number)
);

-- Участники игры
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  seat INT NOT NULL CHECK (seat BETWEEN 1 AND 10),
  role TEXT NOT NULL CHECK (role IN ('citizen', 'mafia', 'sheriff', 'don')),
  result TEXT NOT NULL CHECK (result IN ('win', 'lose')),
  base_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  bonus_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  bonus_comment TEXT,
  total_score NUMERIC(4,1) NOT NULL DEFAULT 0,
  UNIQUE (game_id, seat),
  UNIQUE (game_id, player_id)
);
```

### 3.2. Индексы для производительности

```sql
CREATE INDEX idx_games_season ON games(season_id);
CREATE INDEX idx_games_date ON games(date DESC);
CREATE INDEX idx_game_players_game ON game_players(game_id);
CREATE INDEX idx_game_players_player ON game_players(player_id);
CREATE INDEX idx_game_players_role ON game_players(role);
```

### 3.3. Полезные VIEW для аналитики

```sql
-- Статистика игрока (для рейтинга)
CREATE VIEW player_stats AS
SELECT
  gp.player_id,
  p.nickname,
  g.season_id,
  COUNT(*) AS total_games,
  COUNT(*) FILTER (WHERE gp.result = 'win') AS wins,
  ROUND(COUNT(*) FILTER (WHERE gp.result = 'win')::numeric / COUNT(*) * 100, 1) AS winrate,
  SUM(gp.total_score) AS total_score,
  ROUND(SUM(gp.total_score)::numeric / COUNT(*), 2) AS avg_score
FROM game_players gp
JOIN games g ON g.id = gp.game_id
JOIN players p ON p.id = gp.player_id
GROUP BY gp.player_id, p.nickname, g.season_id;

-- Статистика по ролям
CREATE VIEW player_role_stats AS
SELECT
  gp.player_id,
  g.season_id,
  gp.role,
  COUNT(*) AS total_games,
  COUNT(*) FILTER (WHERE gp.result = 'win') AS wins,
  ROUND(COUNT(*) FILTER (WHERE gp.result = 'win')::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS winrate,
  ROUND(SUM(gp.total_score)::numeric / NULLIF(COUNT(*), 0), 2) AS avg_score
FROM game_players gp
JOIN games g ON g.id = gp.game_id
GROUP BY gp.player_id, g.season_id, gp.role;

-- Статистика сезона (для дашборда)
CREATE VIEW season_stats AS
SELECT
  g.season_id,
  COUNT(*) AS total_games,
  COUNT(*) FILTER (WHERE g.winner = 'red') AS red_wins,
  COUNT(*) FILTER (WHERE g.winner = 'black') AS black_wins,
  ROUND(COUNT(*) FILTER (WHERE g.winner = 'red')::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS red_winrate,
  ROUND(AVG(gp_avg.avg_total), 2) AS avg_score
FROM games g
LEFT JOIN (
  SELECT game_id, AVG(total_score) AS avg_total FROM game_players GROUP BY game_id
) gp_avg ON gp_avg.game_id = g.id
GROUP BY g.season_id;
```

### 3.4. Row Level Security (RLS)

```sql
-- Включаем RLS на всех таблицах
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Вспомогательная функция: проверка роли admin
CREATE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- SEASONS: все читают, только admin пишет
CREATE POLICY "seasons_read" ON seasons FOR SELECT USING (true);
CREATE POLICY "seasons_write" ON seasons FOR ALL USING (is_admin());

-- PLAYERS: все читают, только admin пишет
CREATE POLICY "players_read" ON players FOR SELECT USING (true);
CREATE POLICY "players_write" ON players FOR ALL USING (is_admin());

-- GAMES: все читают, только admin пишет
CREATE POLICY "games_read" ON games FOR SELECT USING (true);
CREATE POLICY "games_write" ON games FOR ALL USING (is_admin());

-- GAME_PLAYERS: все читают, только admin пишет
CREATE POLICY "game_players_read" ON game_players FOR SELECT USING (true);
CREATE POLICY "game_players_write" ON game_players FOR ALL USING (is_admin());

-- PROFILES: каждый видит свой, admin видит все
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT USING (
  id = auth.uid() OR is_admin()
);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());

-- Анонимный доступ к чтению (для зрителей без логина)
-- В Supabase: Settings → Auth → Enable anonymous sign-ins
-- Анонимные пользователи получают SELECT через политики с USING (true)
```

---

## 4. Структура проекта

```
mafia-club-tracker/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── ui/                    # Переиспользуемые компоненты
│   │   │   ├── Modal.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── ConfirmDialog.jsx
│   │   │   └── Toast.jsx
│   │   ├── layout/
│   │   │   ├── Header.jsx         # Шапка + селектор сезона
│   │   │   ├── TabBar.jsx         # Навигация
│   │   │   └── Layout.jsx         # Общий layout
│   │   └── auth/
│   │       ├── LoginForm.jsx      # Форма входа для ведущих
│   │       └── AuthGuard.jsx      # Обёртка: показывает кнопки редактирования только admin
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── GameList.jsx
│   │   ├── GameDetail.jsx
│   │   ├── GameForm.jsx
│   │   ├── Leaderboard.jsx
│   │   ├── PlayerList.jsx
│   │   ├── PlayerProfile.jsx
│   │   └── Settings.jsx
│   ├── lib/
│   │   ├── supabase.js            # Инициализация Supabase клиента
│   │   ├── auth.js                # Хуки авторизации
│   │   ├── queries.js             # Все запросы к БД
│   │   └── constants.js           # ROLE_NAMES, цвета, и т.д.
│   ├── hooks/
│   │   ├── useAuth.js             # Контекст авторизации
│   │   ├── useSeasons.js          # Загрузка/управление сезонами
│   │   ├── usePlayers.js          # Загрузка/управление игроками
│   │   └── useGames.js            # Загрузка/управление играми
│   ├── App.jsx                    # Роутинг + Layout
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Tailwind imports
├── .env.local                     # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## 5. Ключевые изменения в коде

### 5.1. Инициализация Supabase

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 5.2. Замена window.storage на Supabase запросы

**Было (артефакт):**
```javascript
const seasons = await safeGet("seasons", []);
await safeSet("seasons", JSON.stringify(seasons));
```

**Стало (Supabase):**
```javascript
// src/lib/queries.js
import { supabase } from './supabase';

// --- Seasons ---
export async function getSeasons() {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createSeason(season) {
  // Деактивируем текущий активный сезон
  await supabase
    .from('seasons')
    .update({ is_active: false, end_date: new Date().toISOString() })
    .eq('is_active', true);

  const { data, error } = await supabase
    .from('seasons')
    .insert(season)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Players ---
export async function getPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('nickname');
  if (error) throw error;
  return data;
}

export async function createPlayer(player) {
  const { data, error } = await supabase
    .from('players')
    .insert(player)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlayer(id, updates) {
  const { data, error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Games ---
export async function getGamesBySeason(seasonId) {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      game_players (*)
    `)
    .eq('season_id', seasonId)
    .order('game_number', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllGames() {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      game_players (*)
    `)
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createGame(game, gamePlayers) {
  // Вставляем игру
  const { data: newGame, error: gameError } = await supabase
    .from('games')
    .insert(game)
    .select()
    .single();
  if (gameError) throw gameError;

  // Вставляем участников
  const players = gamePlayers.map(gp => ({
    ...gp,
    game_id: newGame.id,
  }));
  const { error: playersError } = await supabase
    .from('game_players')
    .insert(players);
  if (playersError) throw playersError;

  return newGame;
}

export async function deleteGame(gameId) {
  // game_players удалятся каскадно (ON DELETE CASCADE)
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId);
  if (error) throw error;
}

// --- Stats (используем VIEW) ---
export async function getPlayerStats(seasonId = null) {
  let query = supabase.from('player_stats').select('*');
  if (seasonId) query = query.eq('season_id', seasonId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getSeasonStats(seasonId) {
  const { data, error } = await supabase
    .from('season_stats')
    .select('*')
    .eq('season_id', seasonId)
    .single();
  if (error) throw error;
  return data;
}
```

### 5.3. Хук авторизации

```javascript
// src/hooks/useAuth.js
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) checkAdmin(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        if (session?.user) {
          await checkAdmin(session.user.id);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function checkAdmin(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    setIsAdmin(data?.role === 'admin');
    setLoading(false);
  }

  // Ведущий вводит логин + пароль
  // Под капотом логин превращается в технический email: {login}@mafia.local
  async function signIn(login, password) {
    const email = `${login.toLowerCase().trim()}@mafia.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

### 5.3.1. Форма входа

```javascript
// src/components/auth/LoginForm.jsx
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
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm"
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading || !login || !password}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg py-2 text-sm font-medium"
      >
        {loading ? 'Вход...' : 'Войти'}
      </button>
    </div>
  );
}
```

### 5.4. Защита UI для ведущих

```javascript
// src/components/auth/AuthGuard.jsx
import { useAuth } from '../../hooks/useAuth';

// Показывает children только для admin
export function AdminOnly({ children, fallback = null }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : fallback;
}

// Использование в компонентах:
// <AdminOnly>
//   <button onClick={handleDelete}>Удалить</button>
// </AdminOnly>
```

### 5.5. Что меняется в UI

| Компонент | Изменение |
|-----------|-----------|
| Header | + кнопка «Войти» → модал с полями Логин/Пароль. После входа: имя ведущего + «Выйти» |
| GameList | Кнопка «+ Добавить игру» только для admin |
| GameDetail | Кнопки «Редактировать» / «Удалить» только для admin |
| GameForm | Весь экран доступен только для admin |
| PlayerList | Кнопки добавления/редактирования только для admin |
| Settings | Весь экран доступен только для admin |
| Dashboard | Кнопка «+ Добавить игру» только для admin |
| Leaderboard | Без изменений (все видят) |
| PlayerProfile | Без изменений (все видят) |

---

## 6. Миграция данных

### 6.1. Из текущего артефакта в Supabase

Экспортированный JSON из артефакта имеет структуру:
```json
{
  "exportDate": "...",
  "version": 1,
  "seasons": [...],
  "players": [...],
  "games": { "seasonId1": [...], "seasonId2": [...] }
}
```

Скрипт миграции (запустить один раз):

```javascript
// scripts/migrate.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service role для обхода RLS
);

const backup = JSON.parse(fs.readFileSync('mafia_club_backup.json', 'utf8'));

async function migrate() {
  console.log('Migrating seasons...');
  for (const s of backup.seasons) {
    await supabase.from('seasons').insert({
      id: s.id,
      name: s.name,
      start_date: s.startDate,
      end_date: s.endDate,
      is_active: s.isActive,
    });
  }

  console.log('Migrating players...');
  for (const p of backup.players) {
    await supabase.from('players').insert({
      id: p.id,
      nickname: p.nickname,
      real_name: p.realName,
      is_active: p.isActive,
    });
  }

  console.log('Migrating games...');
  for (const [seasonId, games] of Object.entries(backup.games)) {
    for (const g of games) {
      // Вставляем игру
      await supabase.from('games').insert({
        id: g.id,
        season_id: g.seasonId,
        game_number: g.gameNumber,
        date: g.date,
        winner: g.winner,
        notes: g.notes,
      });

      // Вставляем участников
      const gamePlayers = g.players.map(gp => ({
        game_id: g.id,
        player_id: gp.playerId,
        seat: gp.seat,
        role: gp.role,
        result: gp.result,
        base_score: gp.baseScore,
        bonus_score: gp.bonusScore,
        bonus_comment: gp.bonusComment,
        total_score: gp.totalScore,
      }));
      await supabase.from('game_players').insert(gamePlayers);
    }
  }

  console.log('Migration complete!');
}

migrate().catch(console.error);
```

---

## 7. Настройка Supabase

### 7.1. Создание проекта

1. Зайти на https://supabase.com, зарегистрироваться
2. «New Project» → название: `mafia-club`, регион: ближайший (eu-central-1)
3. Запомнить пароль от БД
4. Дождаться создания (~2 мин)

### 7.2. Создание таблиц

1. Зайти в SQL Editor (левое меню)
2. Выполнить SQL из раздела 3.1 (CREATE TABLE)
3. Выполнить SQL из раздела 3.2 (индексы)
4. Выполнить SQL из раздела 3.3 (VIEW)
5. Выполнить SQL из раздела 3.4 (RLS)

### 7.3. Настройка Auth

1. Authentication → Settings
2. Включить Email auth (по умолчанию включен)
3. **Отключить** email confirmation: Auth → Settings → «Confirm email» = OFF
4. Включить Anonymous sign-ins: Auth → Settings → «Allow anonymous sign-ins» = ON
5. Создать первого ведущего: Authentication → Users → «Add user»
   - Email: `admin@mafia.local` (технический, пользователь его не видит)
   - Password: надёжный пароль
6. Вручную в SQL Editor прописать профиль:
   ```sql
   INSERT INTO profiles (id, login, display_name, role)
   VALUES (
     '<UUID пользователя из шага 5>',
     'admin',
     'Главный ведущий',
     'admin'
   );
   ```
7. Добавить второго ведущего (если нужно):
   - Authentication → Users → Add user: `veduschiy2@mafia.local` / пароль
   - SQL: `INSERT INTO profiles (id, login, display_name, role) VALUES ('<UUID>', 'veduschiy2', 'Второй ведущий', 'admin');`

> **Как это работает для пользователя:**
> Ведущий открывает приложение, нажимает «Войти», вводит логин `admin` и пароль.
> Под капотом фронтенд превращает логин в `admin@mafia.local` и авторизуется через Supabase Auth.
> Пользователь никогда не видит email — только поля «Логин» и «Пароль».

### 7.4. Получение ключей

1. Settings → API
2. Скопировать:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → только для скрипта миграции (НЕ класть в фронтенд!)

---

## 8. Настройка фронтенда

### 8.1. Создание проекта

```bash
npm create vite@latest mafia-club-tracker -- --template react
cd mafia-club-tracker
npm install
npm install @supabase/supabase-js
npm install -D tailwindcss @tailwindcss/vite
```

### 8.2. Настройка Tailwind (Vite плагин)

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

```css
/* src/index.css */
@import "tailwindcss";
```

### 8.3. Переменные окружения

```bash
# .env.local (НЕ коммитить в git!)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 8.4. Перенос компонентов из артефакта

Текущий монолитный файл (2800 строк) разбивается на файлы по структуре из раздела 4.
Логика компонентов остаётся той же, меняется только слой данных:

| Было | Стало |
|------|-------|
| `await safeGet("seasons")` | `await getSeasons()` |
| `await safeSet("seasons", data)` | `await createSeason(data)` |
| `await safeGet("games:" + id)` | `await getGamesBySeason(id)` |
| `window.storage.delete(...)` | `await deleteGame(id)` |
| `calcPlayerStats(id, games)` | `await getPlayerStats(seasonId)` (VIEW в БД) |
| useState для навигации | react-router-dom |

---

## 9. Деплой

### 9.1. GitHub репозиторий

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/mafia-club-tracker.git
git push -u origin main
```

### 9.2. Деплой на Vercel

1. Зайти на https://vercel.com, войти через GitHub
2. «Import Project» → выбрать репозиторий
3. Framework: Vite
4. Environment Variables:
   - `VITE_SUPABASE_URL` = значение из Supabase
   - `VITE_SUPABASE_ANON_KEY` = значение из Supabase
5. «Deploy»
6. Готово! Приложение доступно по адресу `mafia-club-tracker-xxx.vercel.app`

### 9.3. Автодеплой

Каждый `git push` в `main` автоматически деплоит новую версию.

---

## 10. Пошаговый план реализации

### Этап 1: Инфраструктура (1 день)

```
□ Создать проект Supabase
□ Выполнить SQL: таблицы, индексы, VIEW, RLS
□ Создать admin-пользователя
□ Создать Vite проект
□ Настроить Tailwind, Supabase клиент
□ Создать GitHub репозиторий
□ Подключить Vercel
□ Проверить: пустая страница открывается по URL
```

### Этап 2: Авторизация (0.5 дня)

```
□ Реализовать useAuth хук
□ AuthProvider в App
□ Форма входа (email + пароль)
□ Кнопка «Войти» / «Выйти» в шапке
□ Компонент AdminOnly
□ Проверить: вход/выход работает
```

### Этап 3: Перенос UI компонентов (1 день)

```
□ Перенести все UI-компоненты (Modal, Badge, StatCard, etc.)
□ Перенести Layout, Header, TabBar
□ Настроить react-router-dom (маршруты из спецификации)
□ Проверить: навигация работает, страницы-заглушки отображаются
```

### Этап 4: CRUD сезонов и игроков (1 день)

```
□ Реализовать queries.js для seasons и players
□ Перенести PlayerList с заменой storage → Supabase
□ Перенести управление сезонами
□ Проверить: CRUD работает, RLS блокирует анонимных
```

### Этап 5: Игры (1-2 дня)

```
□ Реализовать queries.js для games и game_players
□ Перенести GameForm (3 шага)
□ Перенести GameList и GameDetail
□ Кнопка «Из предыдущей игры»
□ Редактирование и удаление
□ Проверить: полный цикл создания/просмотра/удаления игры
```

### Этап 6: Рейтинг и статистика (1 день)

```
□ Перенести Leaderboard (использовать player_stats VIEW)
□ Порог 50% игр
□ Перенести PlayerProfile
□ Статистика по ролям, парам
□ Графики (recharts)
□ Переключатель сезонов
```

### Этап 7: Дашборд и полировка (1 день)

```
□ Перенести Dashboard (использовать season_stats VIEW)
□ Экспорт/импорт (теперь можно скачивать файл напрямую!)
□ Адаптивность
□ Тестирование с телефона
□ Проверить анонимный доступ (без логина видно статистику)
```

### Этап 8: Миграция данных (0.5 дня)

```
□ Экспортировать JSON из текущего артефакта
□ Запустить скрипт миграции
□ Проверить: все данные на месте
□ Раздать ссылку клубу
```

**Итого: ~7 рабочих дней**

---

## 11. Чеклист готовности

| Критерий | Статус |
|----------|--------|
| Открывается с любого устройства по ссылке | ⬜ |
| Ведущие входят по email/паролю | ⬜ |
| Анонимные видят рейтинг и статистику | ⬜ |
| Анонимные НЕ могут редактировать | ⬜ |
| Данные из артефакта перенесены | ⬜ |
| Работает на телефоне | ⬜ |
| 30 человек могут смотреть одновременно | ⬜ |
| Бесплатно | ⬜ |
