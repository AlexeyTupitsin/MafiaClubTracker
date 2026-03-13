# Mafia Club Tracker — Доработки v2

> Этот документ описывает доработки к текущей версии приложения.
> Применять к существующему файлу `MafiaClubTracker.jsx`.
> Каждый пункт — самостоятельное изменение. Можно реализовывать последовательно.

---

## 1. Средний дополнительный балл

### Суть
Новая метрика: **средний доп. балл** = `сумма bonusScore / количество игр`. Выводить везде, где есть средний балл.

### Формула

```javascript
// В calcPlayerStats добавить:
const totalBonus = playerGames.reduce((sum, p) => sum + p.bonusScore, 0);
const avgBonus = totalGames > 0 ? (totalBonus / totalGames) : 0;

// Возвращать:
return {
  ...existingFields,
  totalBonus,    // сумма доп. баллов
  avgBonus,      // средний доп. балл
};
```

### Где отображать

| Место | Что показывать |
|-------|---------------|
| **Рейтинг (таблица)** | Новый столбец «Ср. доп.» после «Ср. балл» |
| **Дашборд (рейтинг)** | Тот же столбец |
| **Профиль игрока (StatCard'ы)** | Новая карточка «Ср. доп. балл» |
| **Профиль — статистика по ролям (таблица)** | Новый столбец «Ср. доп.» — средний bonusScore за каждую роль |
| **Сравнение игроков** | Новая строка «Ср. доп. балл» в таблице сравнения |
| **Номинации** | Без изменений (номинации считают по среднему общему баллу) |

### Формат отображения
- Число с 2 знаками после запятой: `0.35`, `-0.10`
- Если положительный — зелёный текст (`text-green-600`)
- Если отрицательный — красный текст (`text-red-500`)
- Если ноль — обычный цвет

### Изменения в calcRoleStats

```javascript
// Добавить в каждую роль:
const totalBonus = roleGames.reduce((sum, p) => sum + p.bonusScore, 0);
const avgBonus = total > 0 ? (totalBonus / total) : 0;

return {
  ...existingFields,
  avgBonus,
};
```

---

## 2. Переименование и логотип

### Заголовок
- Заменить `🎭 Mafia Club` → `Iron Maf`
- Убрать эмодзи 🎭
- Место для логотипа: `<img>` слева от текста «Iron Maf» в header
- Пока логотип не прикреплён — оставить placeholder: квадрат 32×32 с фоном `bg-gray-200` и текстом «IM»
- Когда логотип будет прикреплён — заменить placeholder на картинку

### Код placeholder'а

```jsx
{/* В Header — замена текущего заголовка */}
<div className="flex items-center gap-2">
  {/* Placeholder — заменить на <img src="..." /> когда будет логотип */}
  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-white text-xs font-bold">
    IM
  </div>
  <h1 className="text-xl font-bold text-gray-900">Iron Maf</h1>
</div>
```

---

## 3. Номинации на вкладке Рейтинг (развёрнутые)

### Суть
На вкладке «Рейтинг» добавить блок номинаций ниже основной таблицы. Аналогичные номинации уже есть на дашборде, но здесь они более развёрнутые.

### Отличия от дашборда

| Параметр | Дашборд | Рейтинг |
|----------|---------|---------|
| Количество мест | Топ-3 | Топ-5 |
| Информация | Ник + ср. балл + кол-во игр | Ник + ср. балл + ср. доп. балл + игр + побед + winrate |
| Формат | Компактные карточки | Мини-таблица для каждой номинации |
| Минимум игр | 3 | 3 |

### Формат каждой номинации

```
🛡️ Лучший шериф

#  | Ник     | Игр | Побед | WR%  | Ср. балл | Ср. доп.
1  | Вася    | 11  | 7     | 64%  | 1.45     | +0.45
2  | Петя    | 8   | 5     | 63%  | 1.20     | +0.20
3  | Маша    | 6   | 4     | 67%  | 1.10     | +0.10
4  | Коля    | 5   | 2     | 40%  | 0.80     | -0.20
5  | Дима    | 4   | 2     | 50%  | 0.75     | -0.25
```

### Layout
- 4 номинации в сетке 2×2
- На мобильном — в колонку (1 номинация на ряд)
- Каждая номинация — карточка `bg-white rounded-xl shadow-sm p-4`
- Клик на ник → переход в профиль игрока

---

## 4. Вкладка «Турниры»

### Суть
Новая вкладка в навигации. Турнир — это именованная группа игр (подмножество игр сезона).

### 4.1. Модель данных

```typescript
interface Tournament {
  id: string;           // UUID
  seasonId: string;     // привязка к сезону
  name: string;         // "Кубок клуба — Март 2026"
  date: string;         // ISO date
  gameIds: string[];    // массив id игр, входящих в турнир
  notes: string | null; // описание
  createdAt: string;    // ISO datetime
}
```

**Ключ хранилища:** `tournaments` (один массив для всех турниров).

### 4.2. Список турниров

- Таблица: название, дата, сезон, количество игр, победы красных/чёрных
- Сортировка: новые сверху
- Фильтр по сезону: «Все» / конкретный сезон
- Кнопка «+ Создать турнир» (ведущий)
- Клик на строку → карточка турнира

### 4.3. Создание турнира

**Форма:**
- Название (обязательно)
- Дата
- Сезон (выбор из списка, по умолчанию — активный)
- Выбор игр: показать список игр выбранного сезона с чекбоксами
  - Отображать: №, дата, победитель
  - Игры, уже привязанные к другому турниру, помечены но доступны для выбора (одна игра может быть в нескольких турнирах)
- Описание (необязательно)
- Кнопка «Сохранить»

### 4.4. Карточка турнира

**Шапка:**
- Название турнира
- Дата, сезон
- Описание (если есть)

**Статистика (карточки-метрики):**
- Всего игр
- Побед красных: количество (%)
- Побед чёрных: количество (%)

**Рейтинг турнира:**
- Таблица рейтинга — как в основном рейтинге, но только по играм турнира
- Порог: ≥50% игр турнира
- Столбцы: #, ник, игры, победы, WR%, баллы, ср. балл, ср. доп. балл

**Номинации турнира (развёрнутые):**
- Как на вкладке «Рейтинг» — топ-5 по каждой роли
- Но расчёт только по играм турнира
- Минимум игр за роль: 1 (для коротких турниров)

**Список игр турнира:**
- Таблица: №, дата, победитель, участники
- Клик → GameDetail

**Кнопки (ведущий):**
- «Редактировать» — изменить название, описание, добавить/убрать игры
- «Удалить» — с подтверждением (удаляется только турнир, игры остаются)

### 4.5. Навигация

- Новый таб в навигации: 🏆 «Турниры» (между «Рейтинг» и «Игроки»)
- Иконка: `Award` из lucide-react
- Новые страницы: `"tournaments"`, `"tournamentDetail"`, `"tournamentForm"`
- Добавить в `currentPage` и `renderPage()`

---

## 5. Баг: кнопка «Назад» в профиле игрока

### Проблема
При нажатии «Назад» из профиля игрока всегда перекидывает на список игроков (`"players"`), даже если пришли из рейтинга, дашборда или сравнения.

### Решение
Хранить `previousPage` в состоянии. При навигации на профиль — запоминать откуда пришли.

```javascript
// В App:
const [previousPage, setPreviousPage] = useState(null);

// Обновить navigate:
const navigate = useCallback((page, id = null) => {
  // Запоминаем откуда пришли при переходе в детальные экраны
  if (["playerProfile", "gameDetail", "compare", "tournamentDetail"].includes(page)) {
    setPreviousPage({ page: currentPage, id: selectedId });
  }
  setCurrentPage(page);
  setSelectedId(id);
}, [currentPage, selectedId]);

// Функция «Назад»:
const goBack = useCallback(() => {
  if (previousPage) {
    setCurrentPage(previousPage.page);
    setSelectedId(previousPage.id);
    setPreviousPage(null);
  } else {
    setCurrentPage("dashboard");
    setSelectedId(null);
  }
}, [previousPage]);
```

### Где передать

- `PlayerProfile` → получает `goBack` вместо `navigate("players")`
- `GameDetail` → получает `goBack` вместо `navigate("games")`
- `TournamentDetail` → получает `goBack`
- Кнопка «← Назад» вызывает `goBack()` вместо `navigate("players")`

---

## 6. Статистика по парам — формат отображения

### Проблема
Сейчас в таблице пар непонятное отображение. Нужен единый формат.

### Новый формат

Каждая ячейка в таблице пар отображается так:

```
{количество_игр} / {количество_побед} ({процент_побед}%)
```

Примеры:
- `8 / 5 (63%)` — 8 совместных игр, 5 побед, 63%
- `3 / 1 (33%)`
- `0 / 0 (—)` — если 0 игр, вместо процента — тире

### Применяется к столбцам

| Столбец | Формат |
|---------|--------|
| Вместе 🔴🔴 | `{bothRed.games} / {bothRed.wins} ({bothRed.winrate}%)` |
| Вместе ⚫⚫ | `{bothBlack.games} / {bothBlack.wins} ({bothBlack.winrate}%)` |
| Я 🔴 Он ⚫ | `{aRedBBlack.games} / {aRedBBlack.winsA} ({aRedBBlack.winrateA}%)` |
| Я ⚫ Он 🔴 | `{aBlackBRed.games} / {aBlackBRed.winsA} ({aBlackBRed.winrateA}%)` |

### Хелпер

```javascript
function fmtPair(games, wins, winrate) {
  if (games === 0) return "—";
  return `${games} / ${wins} (${winrate.toFixed(0)}%)`;
}
```

---

## 7. Баг: Head-to-head в сравнении — неверное количество побед

### Проблема
В разделе «Head-to-head» в сравнении игроков: столбец «Побед» показывает количество игр вместо количества побед. Процент при этом считается правильно.

### Причина
Вероятно, в шаблоне рендеринга для побед используется значение `.games` вместо `.wins` / `.winsA`.

### Как найти и исправить

Искать в компоненте сравнения (`ComparePlayersPage` или аналогичном) раздел head-to-head.
Проверить что отображается:

```jsx
// НЕПРАВИЛЬНО (баг):
<td>{pair.bothRed.games}</td>  {/* это количество ИГР, не побед */}

// ПРАВИЛЬНО:
<td>{pair.bothRed.wins}</td>   {/* количество побед */}
```

### Проверить все 4 комбинации

```jsx
// Вместе красные:
// Игр: pair.bothRed.games | Побед: pair.bothRed.wins | WR: pair.bothRed.winrate

// Вместе чёрные:
// Игр: pair.bothBlack.games | Побед: pair.bothBlack.wins | WR: pair.bothBlack.winrate

// A красный, B чёрный:
// Игр: pair.aRedBBlack.games | Побед A: pair.aRedBBlack.winsA | WR: pair.aRedBBlack.winrateA

// A чёрный, B красный:
// Игр: pair.aBlackBRed.games | Побед A: pair.aBlackBRed.winsA | WR: pair.aBlackBRed.winrateA
```

### После исправления

Применить тот же формат из пункта 6:
```
{games} / {wins} ({winrate}%)
```

---

## 8. Первоубиенный (ПУ) и KillRate

### Суть
В каждой игре ведущий может отметить одного игрока как первоубиенного (убит в первую ночь). На основе этого считается метрика KillRate — как часто игрока убивают первым.

### 8.1. Изменения в модели данных

**Game — новое поле:**

```typescript
interface Game {
  // ...существующие поля...
  firstKilled: string | null;
  // string = playerId убитого игрока
  // null = данные не заполнены (старые игры из сезонов без trackFirstKill)
}
```

> **Важно:** если в игре никого не убили (промах) И сезон отслеживает ПУ,
> то `firstKilled = "miss"`. Если сезон НЕ отслеживает ПУ, то `firstKilled = null`.
> Разница: `"miss"` = «мы знаем что промах», `null` = «данных нет».

**Нет, отменяем "miss".** Упрощённая логика:
- Если у сезона `trackFirstKill === true`: ведущий видит чекбоксы ПУ. Если никого не отметил → промах. `firstKilled = null`.
- Если у сезона `trackFirstKill === false`: чекбоксов нет. `firstKilled = null`.
- Различаем по сезону: для расчёта KillRate берём только игры из сезонов с `trackFirstKill === true`.

**Итого `firstKilled`:**
- `playerId` — этот игрок убит первым
- `null` — либо промах (в сезоне с trackFirstKill), либо данных нет (в сезоне без trackFirstKill)

**Season — новое поле:**

```typescript
interface Season {
  // ...существующие поля...
  trackFirstKill: boolean;
  // true = в играх этого сезона отслеживается ПУ
  // false = не отслеживается (по умолчанию для старых сезонов)
}
```

### 8.2. UI: отметка ПУ на шаге 3 формы игры

- Показывается **только если** у текущего сезона `trackFirstKill === true`
- В таблице игроков на шаге 3 — дополнительный столбец «ПУ» с radio-чекбоксом
- Можно отметить **максимум одного** игрока (radio-поведение: нажал на другого — предыдущий снимается, нажал на отмеченного — снимается отметка)
- Если никто не отмечен → промах (никто не убит в первую ночь)
- **Не является обязательным** — игра сохраняется и без отметки ПУ
- Визуально: маленький кружок-radio, при выборе — красная точка + строка игрока подсвечивается

### 8.3. UI: настройка сезона

- В форме создания/редактирования сезона — чекбокс: «Отслеживать первоубиенного (ПУ)»
- По умолчанию: `true` для новых сезонов
- Для существующих сезонов (до внедрения фичи): `false` (не добавлять через миграцию, а задать при первом чтении — если поле отсутствует, считать `false`)

### 8.4. Метрика KillRate

**Формула:**

```javascript
function calcKillRate(playerId, games, seasons) {
  // Берём только игры из сезонов с trackFirstKill === true
  const trackingSeasonIds = new Set(
    seasons.filter(s => s.trackFirstKill).map(s => s.id)
  );

  const eligibleGames = games.filter(g =>
    trackingSeasonIds.has(g.seasonId) &&
    g.players.some(p => p.playerId === playerId)
  );

  if (eligibleGames.length === 0) return null; // нет данных

  const killedCount = eligibleGames.filter(g => g.firstKilled === playerId).length;

  return {
    gamesTracked: eligibleGames.length,  // игр с отслеживанием ПУ
    timesKilled: killedCount,             // сколько раз убит первым
    killRate: (killedCount / eligibleGames.length) * 100, // процент
  };
}
```

**Возвращает `null`** если нет ни одной игры с отслеживанием → не отображаем KillRate.

### 8.5. Где отображать KillRate

| Место | Как отображать |
|-------|---------------|
| **Рейтинг (таблица)** | Новый столбец «ПУ%» — значение KillRate. Если `null` → «—» |
| **Дашборд (рейтинг)** | Тот же столбец |
| **Профиль игрока (StatCard)** | Карточка «ПУ%» — `timesKilled` из `gamesTracked` (`killRate`%). Если null → не показывать карточку |
| **Профиль — статистика по ролям** | Новый столбец «ПУ%» — KillRate отдельно для каждой роли |
| **Сравнение игроков** | Новая строка «KillRate» в таблице сравнения |
| **Номинации** | Новая номинация: «Самый живучий» (топ-3 с НАИМЕНЬШИМ KillRate, мин. 10 игр с tracking) и «Вечная жертва» (топ-3 с наибольшим KillRate) |
| **GameDetail** | Рядом с именем первоубиенного — бейдж 💀 «ПУ» |
| **Турнир (карточка)** | KillRate в рейтинге турнира (если турнир в сезоне с tracking) |

### 8.6. Формат отображения

```
ПУ%: 15.3% (8 из 52)
```

- Значение с 1 знаком: `15.3%`
- В скобках: `timesKilled из gamesTracked`
- Высокий KillRate (>25%) — красный текст (часто убивают)
- Низкий KillRate (<10%) — зелёный текст (живучий)

### 8.7. Обратная совместимость

- Старые игры: `firstKilled` не существует → считается как `null`
- Старые сезоны: `trackFirstKill` не существует → считается как `false`
- При чтении из storage проверять: `season.trackFirstKill ?? false`, `game.firstKilled ?? null`
- **Миграция не нужна** — приложение корректно работает с отсутствующими полями

---

## 9. Изменения в схеме хранения (сводка по всем пунктам)

### Что меняется в модели данных

**Season — новые поля:**
```typescript
trackFirstKill: boolean  // п.8 — отслеживать ПУ (default: false для старых)
```

**Game — новые поля:**
```typescript
firstKilled: string | null  // п.8 — playerId убитого или null
```

**Tournament — новая сущность (п.4):**
```typescript
interface Tournament {
  id: string;
  seasonId: string;
  name: string;
  date: string;
  gameIds: string[];
  notes: string | null;
  createdAt: string;
}
// Ключ storage: "tournaments"
```

### Обратная совместимость

Все новые поля **опциональны**. Приложение должно корректно работать с данными, где этих полей нет:

```javascript
// При чтении сезона:
const trackFirstKill = season.trackFirstKill ?? false;

// При чтении игры:
const firstKilled = game.firstKilled ?? null;

// При чтении турниров:
const tournaments = await safeGet("tournaments", []);
```

**Миграция данных не требуется.** Старые данные продолжают работать.

---

## 10. SQL-миграции для Supabase

> Эти скрипты нужны при переходе на Supabase (см. `MAFIA_TRACKER_MIGRATION.md`).
> Выполнять в SQL Editor Supabase **после** создания базовых таблиц из миграционного плана.
> Для текущей версии (артефакт с window.storage) миграции не нужны — новые поля подхватываются автоматически через `?? default`.

### 10.1. Первоубиенный — изменение существующих таблиц

```sql
-- Сезон: отслеживание ПУ
ALTER TABLE seasons
  ADD COLUMN track_first_kill BOOLEAN NOT NULL DEFAULT false;

-- Обновить старые сезоны (явно false)
UPDATE seasons SET track_first_kill = false;

-- Новые сезоны по умолчанию true
-- (при создании через UI передавать track_first_kill = true)

-- Игра: первоубиенный
ALTER TABLE games
  ADD COLUMN first_killed UUID REFERENCES players(id) ON DELETE SET NULL;

-- Индекс для быстрого поиска по первоубиенному
CREATE INDEX idx_games_first_killed ON games(first_killed)
  WHERE first_killed IS NOT NULL;
```

### 10.2. Турниры — новая таблица

```sql
-- Таблица турниров
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Связь турнир ↔ игры (many-to-many: игра может быть в нескольких турнирах)
CREATE TABLE tournament_games (
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  PRIMARY KEY (tournament_id, game_id)
);

-- Индексы
CREATE INDEX idx_tournaments_season ON tournaments(season_id);
CREATE INDEX idx_tournaments_date ON tournaments(date DESC);
CREATE INDEX idx_tournament_games_game ON tournament_games(game_id);
```

> **Примечание:** в артефакте (window.storage) турниры хранятся как массив с `gameIds: string[]`.
> В Supabase — нормализованная связь через отдельную таблицу `tournament_games`.
> При миграции `gameIds` раскладываются в строки `tournament_games`.

### 10.3. RLS-политики для новых таблиц

```sql
-- Турниры: все читают, только admin пишет
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_read" ON tournaments FOR SELECT USING (true);
CREATE POLICY "tournaments_write" ON tournaments FOR ALL USING (is_admin());

CREATE POLICY "tournament_games_read" ON tournament_games FOR SELECT USING (true);
CREATE POLICY "tournament_games_write" ON tournament_games FOR ALL USING (is_admin());
```

### 10.4. VIEW для статистики ПУ

```sql
-- KillRate по игрокам (только из сезонов с track_first_kill)
CREATE VIEW player_kill_stats AS
SELECT
  gp.player_id,
  g.season_id,
  COUNT(*) AS games_tracked,
  COUNT(*) FILTER (WHERE g.first_killed = gp.player_id) AS times_killed,
  ROUND(
    COUNT(*) FILTER (WHERE g.first_killed = gp.player_id)::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS kill_rate
FROM game_players gp
JOIN games g ON g.id = gp.game_id
JOIN seasons s ON s.id = g.season_id
WHERE s.track_first_kill = true
GROUP BY gp.player_id, g.season_id;

-- KillRate по ролям
CREATE VIEW player_role_kill_stats AS
SELECT
  gp.player_id,
  gp.role,
  g.season_id,
  COUNT(*) AS games_tracked,
  COUNT(*) FILTER (WHERE g.first_killed = gp.player_id) AS times_killed,
  ROUND(
    COUNT(*) FILTER (WHERE g.first_killed = gp.player_id)::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS kill_rate
FROM game_players gp
JOIN games g ON g.id = gp.game_id
JOIN seasons s ON s.id = g.season_id
WHERE s.track_first_kill = true
GROUP BY gp.player_id, gp.role, g.season_id;
```

### 10.5. VIEW для турниров

```sql
-- Статистика турнира
CREATE VIEW tournament_stats AS
SELECT
  tg.tournament_id,
  COUNT(*) AS total_games,
  COUNT(*) FILTER (WHERE g.winner = 'red') AS red_wins,
  COUNT(*) FILTER (WHERE g.winner = 'black') AS black_wins,
  ROUND(COUNT(*) FILTER (WHERE g.winner = 'red')::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS red_winrate
FROM tournament_games tg
JOIN games g ON g.id = tg.game_id
GROUP BY tg.tournament_id;

-- Рейтинг игроков в турнире
CREATE VIEW tournament_player_stats AS
SELECT
  tg.tournament_id,
  gp.player_id,
  p.nickname,
  COUNT(*) AS total_games,
  COUNT(*) FILTER (WHERE gp.result = 'win') AS wins,
  ROUND(COUNT(*) FILTER (WHERE gp.result = 'win')::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS winrate,
  SUM(gp.total_score) AS total_score,
  ROUND(SUM(gp.total_score)::numeric / NULLIF(COUNT(*), 0), 2) AS avg_score,
  ROUND(SUM(gp.bonus_score)::numeric / NULLIF(COUNT(*), 0), 2) AS avg_bonus
FROM tournament_games tg
JOIN game_players gp ON gp.game_id = tg.game_id
JOIN players p ON p.id = gp.player_id
GROUP BY tg.tournament_id, gp.player_id, p.nickname;
```

### 10.6. Supabase-запросы для турниров (queries.js)

```javascript
// Получить все турниры
export async function getTournaments(seasonId = null) {
  let query = supabase
    .from('tournaments')
    .select('*, tournament_games(game_id)')
    .order('date', { ascending: false });
  if (seasonId) query = query.eq('season_id', seasonId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Создать турнир с играми
export async function createTournament(tournament, gameIds) {
  const { data, error } = await supabase
    .from('tournaments')
    .insert(tournament)
    .select()
    .single();
  if (error) throw error;

  if (gameIds.length > 0) {
    const links = gameIds.map(gid => ({
      tournament_id: data.id,
      game_id: gid,
    }));
    const { error: linkError } = await supabase
      .from('tournament_games')
      .insert(links);
    if (linkError) throw linkError;
  }

  return data;
}

// Удалить турнир (tournament_games удалятся каскадно)
export async function deleteTournament(id) {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Статистика турнира (из VIEW)
export async function getTournamentStats(tournamentId) {
  const { data, error } = await supabase
    .from('tournament_stats')
    .select('*')
    .eq('tournament_id', tournamentId)
    .single();
  if (error) throw error;
  return data;
}
```

### 10.7. Скрипт миграции данных (дополнение к существующему)

```javascript
// Добавить в scripts/migrate.js:

// Миграция турниров (если есть в JSON)
if (backup.tournaments) {
  console.log('Migrating tournaments...');
  for (const t of backup.tournaments) {
    await supabase.from('tournaments').insert({
      id: t.id,
      season_id: t.seasonId,
      name: t.name,
      date: t.date,
      notes: t.notes,
    });

    if (t.gameIds && t.gameIds.length > 0) {
      const links = t.gameIds.map(gid => ({
        tournament_id: t.id,
        game_id: gid,
      }));
      await supabase.from('tournament_games').insert(links);
    }
  }
}

// Миграция firstKilled в играх
// (если в JSON есть поле firstKilled у игр — оно подхватится автоматически)
```

---

## Порядок реализации (обновлённый)

Рекомендуемый порядок (от простого к сложному):

| # | Задача | Сложность | Затрагивает данные | SQL-миграция |
|---|--------|-----------|--------------------|--------------|
| 1 | Баг: Head-to-head побед (п.7) | 🟢 лёгкий | Нет | Нет |
| 2 | Формат пар (п.6) | 🟢 лёгкий | Нет | Нет |
| 3 | Переименование Iron Maf (п.2) | 🟢 лёгкий | Нет | Нет |
| 4 | Баг: кнопка «Назад» (п.5) | 🟡 средний | Нет | Нет |
| 5 | Средний доп. балл (п.1) | 🟡 средний | Нет | Нет |
| 6 | Номинации на Рейтинге (п.3) | 🟡 средний | Нет | Нет |
| 7 | Первоубиенный + KillRate (п.8) | 🟡 средний | Season + Game | п.10.1, п.10.4 |
| 8 | Вкладка Турниры (п.4) | 🔴 сложный | Новая сущность | п.10.2, п.10.3, п.10.5 |

