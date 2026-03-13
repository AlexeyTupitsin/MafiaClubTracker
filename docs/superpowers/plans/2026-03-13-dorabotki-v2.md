# Dorabotki V2 — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать 8 доработок к Mafia Club Tracker: исправления багов, новые метрики, переименование, номинации, первоубиенный + KillRate, вкладка турниров.

**Architecture:** Все изменения — frontend (React компоненты + metrics.js + queries.js) + SQL миграции для Supabase (этапы 7-8). Навигация state-based через App.jsx. Данные из Supabase через REST API в queries.js.

**Tech Stack:** React 19, Tailwind CSS v4, Recharts, lucide-react, Supabase PostgreSQL

**Spec:** `MAFIA_TRACKER_DORABOTKI_V2.md`

---

## Chunk 1: Bug fixes и косметика (Этапы 1-3)

### Task 1: Баг Head-to-head — неверное количество побед (п.7)

**Проблема:** В PlayerCompare.jsx колонка "Побед / WR%" показывает количество ИГР вместо побед. `fmtPairCell(pairStats.bothRed.games, ...)` вместо `fmtPairCell(pairStats.bothRed.wins, ...)`.

**Files:**
- Modify: `src/pages/PlayerCompare.jsx:52,184-204`

- [ ] **Step 1: Исправить fmtPairCell и head-to-head таблицу**

В `src/pages/PlayerCompare.jsx`, строка 52, изменить `fmtPairCell`:

```javascript
// БЫЛО:
const fmtPairCell = (g, w) => g > 0 ? `${g} / ${fmtWr(w)}` : "—";

// СТАЛО (новый формат из п.6 + п.7):
const fmtPairCell = (games, wins, winrate) => games > 0 ? `${games} / ${wins} (${winrate.toFixed(0)}%)` : "—";
```

Строки 186-204 — исправить вызовы в head-to-head таблице:

```jsx
{/* Оба красные */}
<td className="py-2 text-center">{fmtPairCell(pairStats.bothRed.games, pairStats.bothRed.wins, pairStats.bothRed.winrate)}</td>

{/* Оба чёрные */}
<td className="py-2 text-center">{fmtPairCell(pairStats.bothBlack.games, pairStats.bothBlack.wins, pairStats.bothBlack.winrate)}</td>

{/* A красный, B чёрный */}
<td className="py-2 text-center">{fmtPairCell(pairStats.aRedBBlack.games, pairStats.aRedBBlack.winsA, pairStats.aRedBBlack.winrateA)}</td>

{/* A чёрный, B красный */}
<td className="py-2 text-center">{fmtPairCell(pairStats.aBlackBRed.games, pairStats.aBlackBRed.winsA, pairStats.aBlackBRed.winrateA)}</td>
```

Также убрать колонку "Игр" (она дублируется в новом формате) — заменить заголовки:

```jsx
<th className="text-left py-2 font-medium text-gray-500">Комбинация</th>
<th className="text-center py-2 font-medium text-gray-500">Игр / Побед (WR%)</th>
```

И убрать отдельные `<td>` для "Игр" в каждой строке.

- [ ] **Step 2: Проверить локально**

Run: `npm run dev`
Проверка: Открыть Сравнение игроков → выбрать двух игроков → секция Head-to-head должна показывать формат `8 / 5 (63%)`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PlayerCompare.jsx
git commit -m "fix: head-to-head shows wins instead of games, unified pair format"
```

---

### Task 2: Формат пар в профиле игрока (п.6)

**Проблема:** В PlayerProfile.jsx таблица пар использует старый формат `games / winrate%`. Нужен `games / wins (winrate%)`.

**Files:**
- Modify: `src/pages/PlayerProfile.jsx:140,346-365`

- [ ] **Step 1: Обновить fmtPairCell в PlayerProfile**

Строка 140:

```javascript
// БЫЛО:
const fmtPairCell = (g, w) => g > 0 ? `${g} / ${fmtWr(w)}` : "—";

// СТАЛО:
const fmtPairCell = (games, wins, winrate) => games > 0 ? `${games} / ${wins} (${winrate.toFixed(0)}%)` : "—";
```

Строки 353-364 — обновить вызовы в таблице пар:

```jsx
<td className="px-2 py-1.5 text-center text-xs">
  {fmtPairCell(p.bothRed.games, p.bothRed.wins, p.bothRed.winrate)}
</td>
<td className="px-2 py-1.5 text-center text-xs">
  {fmtPairCell(p.bothBlack.games, p.bothBlack.wins, p.bothBlack.winrate)}
</td>
<td className="px-2 py-1.5 text-center text-xs">
  {fmtPairCell(p.aRedBBlack.games, p.aRedBBlack.winsA, p.aRedBBlack.winrateA)}
</td>
<td className="px-2 py-1.5 text-center text-xs">
  {fmtPairCell(p.aBlackBRed.games, p.aBlackBRed.winsA, p.aBlackBRed.winrateA)}
</td>
```

- [ ] **Step 2: Проверить локально**

Проверка: Профиль игрока → таблица пар → формат `8 / 5 (63%)`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PlayerProfile.jsx
git commit -m "fix: pair stats format — show games/wins/winrate"
```

---

### Task 3: Переименование Iron Maf + placeholder логотипа (п.2)

**Files:**
- Modify: `src/components/layout/Header.jsx:14-17`
- Modify: `src/pages/Dashboard.jsx:67-68`

- [ ] **Step 1: Обновить Header**

В `src/components/layout/Header.jsx`, строки 15-17, заменить заголовок:

```jsx
{/* БЫЛО: */}
<h1 className="text-xl font-bold text-gray-900">
  <span className="mr-1.5">🎭</span>Mafia Club
</h1>

{/* СТАЛО: */}
<div className="flex items-center gap-2">
  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-white text-xs font-bold">
    IM
  </div>
  <h1 className="text-xl font-bold text-gray-900">Iron Maf</h1>
</div>
```

- [ ] **Step 2: Обновить Dashboard welcome screen**

В `src/pages/Dashboard.jsx`, строки 67-68:

```jsx
{/* БЫЛО: */}
<div className="text-5xl mb-4">{"\u{1F3AD}"}</div>
<h2 className="text-2xl font-bold text-gray-900 mb-2">Добро пожаловать в Mafia Club!</h2>

{/* СТАЛО: */}
<div className="text-5xl mb-4">{"\u{1F3AD}"}</div>
<h2 className="text-2xl font-bold text-gray-900 mb-2">Добро пожаловать в Iron Maf!</h2>
```

- [ ] **Step 3: Проверить локально**

Проверка: Header показывает "IM" placeholder + "Iron Maf". Dashboard welcome тоже.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Header.jsx src/pages/Dashboard.jsx
git commit -m "feat: rename to Iron Maf with logo placeholder"
```

---

## Chunk 2: Навигация и метрики (Этапы 4-5)

### Task 4: Баг кнопки «Назад» (п.5)

**Проблема:** Кнопка «Назад» в PlayerProfile, GameDetail, ComparePlayersPage всегда перекидывает на фиксированную страницу, а не туда откуда пришли.

**Files:**
- Modify: `src/App.jsx:29,39-42,181-315` (state + navigate + goBack + передача props)
- Modify: `src/pages/PlayerProfile.jsx:16,113,146` (все кнопки «Назад»)
- Modify: `src/pages/GameDetail.jsx:18,47` (кнопка «Назад»)
- Modify: `src/pages/PlayerCompare.jsx:80` (кнопка «Назад»)

- [ ] **Step 1: Добавить previousPage state и goBack в App.jsx**

В `src/App.jsx`, после строки 30 добавить:

```javascript
const [previousPage, setPreviousPage] = useState(null);
```

Заменить navigate (строки 39-42):

```javascript
const navigate = useCallback((page, id = null) => {
  if (["playerProfile", "gameDetail", "compare", "tournamentDetail"].includes(page)) {
    setPreviousPage({ page: currentPage, id: selectedId });
  }
  setCurrentPage(page);
  setSelectedId(id);
}, [currentPage, selectedId]);
```

Добавить goBack после navigate:

```javascript
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

- [ ] **Step 2: Передать goBack в компоненты через renderPage**

В `src/App.jsx`, в renderPage() добавить `goBack` prop ко всем детальным страницам:

```jsx
case "playerProfile":
  return <PlayerProfile ... goBack={goBack} />;

case "gameDetail":
  return <GameDetail ... goBack={goBack} />;

case "compare":
  return <PlayerCompare ... goBack={goBack} />;
```

- [ ] **Step 3: Использовать goBack в PlayerProfile**

В `src/pages/PlayerProfile.jsx`:

Добавить `goBack` в деструктуризацию props (строка 9):

```javascript
export function PlayerProfile({ player, games, players, navigate, seasons, currentSeasonId, allGames, tournaments, goBack }) {
```

Заменить все `navigate("players")` на `goBack()`:

- Строка 16: `<button onClick={() => goBack()}>` (empty state)
- Строка 113: `<button onClick={() => goBack()}>` (no games state)
- Строка 146: `<button onClick={() => goBack()}>` (main header)

- [ ] **Step 4: Использовать goBack в GameDetail**

В `src/pages/GameDetail.jsx`:

Props (строка 9): добавить `goBack`

```javascript
export function GameDetail({ game, players, navigate, games, currentSeason, showToast, refreshGames, refreshAllGames, tournaments, goBack }) {
```

Заменить:
- Строка 18: `<button onClick={() => goBack()}>` (empty state)
- Строка 47: `<button onClick={() => goBack()}>` (header)

- [ ] **Step 5: Использовать goBack в PlayerCompare**

В `src/pages/PlayerCompare.jsx`:

Props (строка 8): добавить `goBack`

```javascript
export function PlayerCompare({ players, allGames, games, seasons, currentSeasonId, navigate, preselectedId, goBack }) {
```

Строка 80: `<button onClick={() => goBack()}>` (header)

- [ ] **Step 6: Проверить локально**

Проверка:
1. Дашборд → клик на ник → Профиль → «Назад» → возврат на Дашборд (не на Игроки)
2. Рейтинг → клик на ник → Профиль → «Назад» → возврат на Рейтинг
3. Игры → клик на игру → GameDetail → «Назад» → возврат на Игры

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/pages/PlayerProfile.jsx src/pages/GameDetail.jsx src/pages/PlayerCompare.jsx
git commit -m "fix: back button returns to previous page, not hardcoded"
```

---

### Task 5: Средний дополнительный балл (п.1)

**Files:**
- Modify: `src/lib/metrics.js:3-18,39-58,117-140`
- Modify: `src/pages/Leaderboard.jsx:87-94,166-213`
- Modify: `src/pages/Dashboard.jsx:168-214`
- Modify: `src/pages/PlayerProfile.jsx:172-180,276-302`
- Modify: `src/pages/PlayerCompare.jsx:69-75`

- [ ] **Step 1: Добавить avgBonus в calcPlayerStats**

В `src/lib/metrics.js`, функция `calcPlayerStats` (строки 3-18):

```javascript
export function calcPlayerStats(playerId, games) {
  const playerGames = games.flatMap((g) =>
    g.players.filter((p) => p.playerId === playerId).map((p) => ({ ...p, game: g }))
  );
  const totalGames = playerGames.length;
  const wins = playerGames.filter((p) => p.result === "win").length;
  const totalScore = playerGames.reduce((sum, p) => sum + p.totalScore, 0);
  const totalBonus = playerGames.reduce((sum, p) => sum + p.bonusScore, 0);
  return {
    totalGames,
    wins,
    losses: totalGames - wins,
    winrate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
    totalScore,
    avgScore: totalGames > 0 ? totalScore / totalGames : 0,
    totalBonus,
    avgBonus: totalGames > 0 ? totalBonus / totalGames : 0,
  };
}
```

- [ ] **Step 2: Добавить avgBonus в calcRoleStats**

В `src/lib/metrics.js`, функция `calcRoleStats` (строки 39-58):

```javascript
export function calcRoleStats(playerId, games) {
  const roles = ["citizen", "sheriff", "mafia", "don"];
  return roles.map((role) => {
    const roleGames = games.flatMap((g) =>
      g.players
        .filter((p) => p.playerId === playerId && p.role === role)
        .map((p) => ({ ...p, game: g }))
    );
    const total = roleGames.length;
    const wins = roleGames.filter((p) => p.result === "win").length;
    const score = roleGames.reduce((sum, p) => sum + p.totalScore, 0);
    const totalBonus = roleGames.reduce((sum, p) => sum + p.bonusScore, 0);
    return {
      role,
      games: total,
      wins,
      winrate: total > 0 ? (wins / total) * 100 : 0,
      avgScore: total > 0 ? score / total : 0,
      avgBonus: total > 0 ? totalBonus / total : 0,
    };
  });
}
```

- [ ] **Step 3: Добавить столбец "Ср. доп." в Leaderboard**

В `src/pages/Leaderboard.jsx`:

Добавить в массив columns (после строки 94):

```javascript
{ key: "avgBonus", label: "Ср. доп.", sortable: true },
```

Добавить `<td>` в tbody (после `avgScore` ячейки, ~строка 209):

```jsx
<td className="px-3 py-2.5 text-center">
  <span className={
    row.avgBonus > 0 ? "text-green-600" :
    row.avgBonus < 0 ? "text-red-500" : ""
  }>
    {row.avgBonus.toFixed(2)}
  </span>
</td>
```

- [ ] **Step 4: Добавить столбец "Ср. доп." в Dashboard рейтинг**

В `src/pages/Dashboard.jsx`, таблица рейтинга:

Добавить заголовок после "Ср. балл" (~строка 188):

```jsx
<th className="px-2 py-2 text-center font-medium text-gray-500 cursor-pointer select-none" onClick={() => handleSort("avgBonus")}>
  Ср. доп.<SortIcon col="avgBonus" />
</th>
```

Добавить ячейку после `avgScore` (~строка 210):

```jsx
<td className="px-2 py-2 text-center">
  <span className={
    row.avgBonus > 0 ? "text-green-600" :
    row.avgBonus < 0 ? "text-red-500" : ""
  }>
    {row.avgBonus.toFixed(2)}
  </span>
</td>
```

- [ ] **Step 5: Добавить StatCard "Ср. доп. балл" в PlayerProfile**

В `src/pages/PlayerProfile.jsx`, после строки 179 (StatCard для "Ср. балл"):

```jsx
<StatCard label="Ср. доп."
  value={
    <span className={
      stats.avgBonus > 0 ? "text-green-600" :
      stats.avgBonus < 0 ? "text-red-500" : ""
    }>
      {stats.avgBonus.toFixed(2)}
    </span>
  }
/>
```

Обновить grid: `grid-cols-3 sm:grid-cols-7` (было sm:grid-cols-6).

- [ ] **Step 6: Добавить столбец "Ср. доп." в таблицу ролей PlayerProfile**

В таблице ролей (~строки 278-302), добавить заголовок:

```jsx
<th className="text-center py-1.5 font-medium text-gray-500">Ср. доп.</th>
```

И ячейку в tbody:

```jsx
<td className="py-1.5 text-center">
  {r.games > 0 ? (
    <span className={
      r.avgBonus > 0 ? "text-green-600" :
      r.avgBonus < 0 ? "text-red-500" : ""
    }>
      {r.avgBonus.toFixed(2)}
    </span>
  ) : "—"}
</td>
```

- [ ] **Step 7: Добавить строку "Ср. доп. балл" в PlayerCompare**

В `src/pages/PlayerCompare.jsx`, массив statRows (~строки 69-75):

Добавить после строки "Ср. балл":

```javascript
{ label: "Ср. доп.", a: statsA.avgBonus, b: statsB.avgBonus, better: true, fmt: (v) => (
  <span className={v > 0 ? "text-green-600" : v < 0 ? "text-red-500" : ""}>
    {v.toFixed(2)}
  </span>
)},
```

**Важно:** fmt возвращает JSX, поэтому в рендере нужно проверить: если fmt возвращает ReactElement — рендерить как есть.

Альтернатива (проще): добавить отдельную строку с цветным значением, без изменения fmt логики.

- [ ] **Step 8: Проверить локально**

Проверка:
1. Рейтинг: новый столбец "Ср. доп." с зелёным/красным цветом
2. Дашборд: тот же столбец
3. Профиль: новая StatCard + столбец в таблице ролей
4. Сравнение: новая строка

- [ ] **Step 9: Commit**

```bash
git add src/lib/metrics.js src/pages/Leaderboard.jsx src/pages/Dashboard.jsx src/pages/PlayerProfile.jsx src/pages/PlayerCompare.jsx
git commit -m "feat: add average bonus score metric everywhere"
```

---

## Chunk 3: Номинации на рейтинге (Этап 6)

### Task 6: Развёрнутые номинации на вкладке Рейтинг (п.3)

**Files:**
- Modify: `src/lib/metrics.js` (новая функция calcExtendedNominations)
- Modify: `src/pages/Leaderboard.jsx` (добавить блок номинаций)

- [ ] **Step 1: Создать calcExtendedNominations в metrics.js**

Добавить в конец `src/lib/metrics.js`:

```javascript
export function calcExtendedNominations(games, players) {
  const roles = ["citizen", "sheriff", "mafia", "don"];
  const totalGames = games.length;
  const minGames = Math.max(1, Math.floor(totalGames * 0.1));
  const result = {};

  for (const role of roles) {
    const playerScores = [];
    for (const player of players) {
      const roleGames = games.flatMap((g) =>
        g.players.filter((p) => p.playerId === player.id && p.role === role)
      );
      if (roleGames.length < minGames) continue;

      const wins = roleGames.filter((p) => p.result === "win").length;
      const totalScore = roleGames.reduce((sum, p) => sum + p.totalScore, 0);
      const totalBonus = roleGames.reduce((sum, p) => sum + p.bonusScore, 0);

      playerScores.push({
        playerId: player.id,
        nickname: player.nickname,
        games: roleGames.length,
        wins,
        winrate: (wins / roleGames.length) * 100,
        avgScore: totalScore / roleGames.length,
        avgBonus: totalBonus / roleGames.length,
      });
    }
    result[role] = playerScores.sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
  }
  return { nominations: result, minGames };
}
```

- [ ] **Step 2: Добавить блок номинаций в Leaderboard.jsx**

В `src/pages/Leaderboard.jsx`:

Добавить импорт:

```javascript
import { calcPlayerStats, calcExtendedNominations } from "../lib/metrics";
import { NOMINATION_CONFIG } from "../lib/constants";
```

Добавить useMemo после sorted:

```javascript
const { nominations, minGames: nomMinGames } = useMemo(
  () => calcExtendedNominations(activeGames, players),
  [activeGames, players]
);
```

После `</div>` таблицы рейтинга (после строки 215), добавить блок номинаций:

```jsx
{/* Nominations */}
{activeGames.length > 0 && (
  <div className="mt-6">
    <h3 className="text-lg font-semibold mb-3">Номинации</h3>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {NOMINATION_CONFIG.map(({ role, emoji, label }) => {
        const top = nominations[role] || [];
        return (
          <div key={role} className="bg-white rounded-xl shadow-sm p-4">
            <div className="font-semibold mb-2">{emoji} {label}</div>
            {top.length === 0 ? (
              <p className="text-sm text-gray-400">Мин. {nomMinGames} игр за роль</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 font-medium text-gray-500">#</th>
                      <th className="text-left py-1 font-medium text-gray-500">Ник</th>
                      <th className="text-center py-1 font-medium text-gray-500">Игр</th>
                      <th className="text-center py-1 font-medium text-gray-500">Побед</th>
                      <th className="text-center py-1 font-medium text-gray-500">WR%</th>
                      <th className="text-center py-1 font-medium text-gray-500">Ср. балл</th>
                      <th className="text-center py-1 font-medium text-gray-500">Ср. доп.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top.map((p, i) => (
                      <tr key={p.playerId} className="border-b last:border-b-0">
                        <td className="py-1 font-medium">{i + 1}</td>
                        <td className="py-1">
                          <button onClick={() => navigate("playerProfile", p.playerId)}
                            className="text-indigo-600 hover:underline">{p.nickname}</button>
                        </td>
                        <td className="py-1 text-center">{p.games}</td>
                        <td className="py-1 text-center">{p.wins}</td>
                        <td className="py-1 text-center">{p.winrate.toFixed(0)}%</td>
                        <td className="py-1 text-center">{p.avgScore.toFixed(2)}</td>
                        <td className="py-1 text-center">
                          <span className={
                            p.avgBonus > 0 ? "text-green-600" :
                            p.avgBonus < 0 ? "text-red-500" : ""
                          }>
                            {p.avgBonus > 0 ? "+" : ""}{p.avgBonus.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 3: Проверить локально**

Проверка: Вкладка Рейтинг → ниже таблицы 4 номинации в сетке 2x2 с мини-таблицами топ-5.

- [ ] **Step 4: Commit**

```bash
git add src/lib/metrics.js src/pages/Leaderboard.jsx
git commit -m "feat: extended nominations with top-5 on Rating page"
```

---

## Chunk 4: Первоубиенный + KillRate (Этап 7)

### Task 7: SQL-миграция для firstKilled и trackFirstKill

**Files:**
- Create: `sql/007_first_killed.sql`

- [ ] **Step 1: Создать SQL миграцию**

Создать `sql/007_first_killed.sql`:

```sql
-- Season: track first kill feature
ALTER TABLE seasons
  ADD COLUMN IF NOT EXISTS track_first_kill BOOLEAN NOT NULL DEFAULT false;

-- Game: first killed player
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS first_killed UUID REFERENCES players(id) ON DELETE SET NULL;

-- Index for first_killed lookups
CREATE INDEX IF NOT EXISTS idx_games_first_killed ON games(first_killed)
  WHERE first_killed IS NOT NULL;
```

- [ ] **Step 2: Выполнить миграцию в Supabase SQL Editor**

Вручную выполнить SQL в Supabase Dashboard → SQL Editor.

- [ ] **Step 3: Commit**

```bash
git add sql/007_first_killed.sql
git commit -m "feat: SQL migration for firstKilled + trackFirstKill"
```

---

### Task 8: Обновить queries.js для новых полей

**Files:**
- Modify: `src/lib/queries.js:49-66,99-111,127-158,213-256`

- [ ] **Step 1: Обновить toFrontendSeason**

В `src/lib/queries.js`, функция `toFrontendSeason` (~строка 49):

```javascript
function toFrontendSeason(row) {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
    trackFirstKill: row.track_first_kill ?? false,
  };
}
```

- [ ] **Step 2: Обновить toDbSeason**

В `toDbSeason` (~строка 59):

```javascript
function toDbSeason(obj) {
  const row = {};
  if (obj.name !== undefined) row.name = obj.name;
  if (obj.startDate !== undefined) row.start_date = obj.startDate;
  if (obj.endDate !== undefined) row.end_date = obj.endDate;
  if (obj.isActive !== undefined) row.is_active = obj.isActive;
  if (obj.trackFirstKill !== undefined) row.track_first_kill = obj.trackFirstKill;
  return row;
}
```

- [ ] **Step 3: Обновить toFrontendGame**

В `toFrontendGame` (~строка 99):

```javascript
function toFrontendGame(row) {
  return {
    id: row.id,
    seasonId: row.season_id,
    tournamentId: row.tournament_id || null,
    gameNumber: row.game_number,
    date: row.date,
    winner: row.winner,
    notes: row.notes,
    firstKilled: row.first_killed ?? null,
    createdAt: row.created_at,
    players: (row.game_players || []).map(toFrontendGamePlayer),
  };
}
```

- [ ] **Step 4: Обновить createGame и updateGame**

В `createGame` (~строка 223), body добавить:

```javascript
first_killed: game.firstKilled || null,
```

В `updateGame` (~строка 258), body добавить:

```javascript
first_killed: game.firstKilled || null,
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries.js
git commit -m "feat: queries support firstKilled + trackFirstKill fields"
```

---

### Task 9: Метрика calcKillRate в metrics.js

**Files:**
- Modify: `src/lib/metrics.js`

- [ ] **Step 1: Добавить calcKillRate**

В конец `src/lib/metrics.js`:

```javascript
export function calcKillRate(playerId, games, seasons) {
  const trackingSeasonIds = new Set(
    seasons.filter((s) => s.trackFirstKill).map((s) => s.id)
  );

  const eligibleGames = games.filter((g) =>
    trackingSeasonIds.has(g.seasonId) &&
    g.players.some((p) => p.playerId === playerId)
  );

  if (eligibleGames.length === 0) return null;

  const killedCount = eligibleGames.filter((g) => g.firstKilled === playerId).length;

  return {
    gamesTracked: eligibleGames.length,
    timesKilled: killedCount,
    killRate: (killedCount / eligibleGames.length) * 100,
  };
}

export function calcRoleKillRate(playerId, games, seasons) {
  const trackingSeasonIds = new Set(
    seasons.filter((s) => s.trackFirstKill).map((s) => s.id)
  );
  const roles = ["citizen", "sheriff", "mafia", "don"];

  return roles.map((role) => {
    const eligibleGames = games.filter((g) => {
      if (!trackingSeasonIds.has(g.seasonId)) return false;
      return g.players.some((p) => p.playerId === playerId && p.role === role);
    });

    if (eligibleGames.length === 0) return { role, killRate: null };

    const killedCount = eligibleGames.filter((g) => g.firstKilled === playerId).length;
    return {
      role,
      gamesTracked: eligibleGames.length,
      timesKilled: killedCount,
      killRate: (killedCount / eligibleGames.length) * 100,
    };
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/metrics.js
git commit -m "feat: add calcKillRate and calcRoleKillRate metrics"
```

---

### Task 10: UI — отметка ПУ в GameForm (шаг 3)

**Files:**
- Modify: `src/pages/GameForm.jsx:8,28,106-123,414-508`

- [ ] **Step 1: Добавить state firstKilled**

В `src/pages/GameForm.jsx`, после строки 29 (gameDate state):

```javascript
const [firstKilled, setFirstKilled] = useState(null);
```

В useEffect для editingGame (~строка 32), добавить:

```javascript
setFirstKilled(editingGame.firstKilled || null);
```

- [ ] **Step 2: Добавить колонку ПУ в таблицу шага 3**

В `src/pages/GameForm.jsx`, если `currentSeason?.trackFirstKill`, добавить столбец "ПУ" в thead:

```jsx
{currentSeason?.trackFirstKill && (
  <th className="text-center px-2 py-2 font-medium text-gray-500">ПУ</th>
)}
```

И в tbody, каждая строка:

```jsx
{currentSeason?.trackFirstKill && (
  <td className="px-2 py-2 text-center">
    <button
      type="button"
      onClick={() => setFirstKilled(firstKilled === seat.playerId ? null : seat.playerId)}
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
        firstKilled === seat.playerId
          ? "border-red-500 bg-red-500"
          : "border-gray-300 hover:border-red-300"
      }`}
    >
      {firstKilled === seat.playerId && (
        <span className="w-2 h-2 rounded-full bg-white" />
      )}
    </button>
  </td>
)}
```

- [ ] **Step 3: Передать firstKilled в handleSave**

В handleSave (~строка 106), добавить `firstKilled` в объект игры:

```javascript
// В createGame / updateGame вызовах:
firstKilled: currentSeason?.trackFirstKill ? firstKilled : null,
```

- [ ] **Step 4: Подсветить строку первоубиенного**

В tbody шага 3, добавить подсветку строки:

```jsx
<tr key={idx} className={`border-b last:border-b-0 ${
  firstKilled === seat.playerId ? "bg-red-50" : ""
}`}>
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/GameForm.jsx
git commit -m "feat: first killed selection in game form step 3"
```

---

### Task 11: UI — настройка trackFirstKill в сезонах (Settings)

**Files:**
- Modify: `src/pages/Settings.jsx:57-63,479-501`

- [ ] **Step 1: Добавить чекбокс trackFirstKill в форму нового сезона**

В `src/pages/Settings.jsx`, добавить state:

```javascript
const [trackFirstKill, setTrackFirstKill] = useState(true);
```

В handleCreateSeason, передать в createSeason:

```javascript
const newSeason = await createSeason({
  name: trimmed,
  startDate: seasonStart,
  endDate: null,
  isActive: true,
  trackFirstKill,
});
```

В модалку нового сезона (между датой и предупреждением, ~строка 494):

```jsx
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="trackFirstKill"
    checked={trackFirstKill}
    onChange={(e) => setTrackFirstKill(e.target.checked)}
    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
  />
  <label htmlFor="trackFirstKill" className="text-sm text-gray-700">
    Отслеживать первоубиенного (ПУ)
  </label>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Settings.jsx
git commit -m "feat: trackFirstKill toggle in season creation"
```

---

### Task 12: UI — отображение KillRate (п.8.5)

**Files:**
- Modify: `src/pages/Leaderboard.jsx` (столбец ПУ%)
- Modify: `src/pages/Dashboard.jsx` (столбец ПУ%)
- Modify: `src/pages/PlayerProfile.jsx` (StatCard + столбец в ролях)
- Modify: `src/pages/PlayerCompare.jsx` (строка KillRate)
- Modify: `src/pages/GameDetail.jsx` (бейдж ПУ)

- [ ] **Step 1: Добавить столбец ПУ% в Leaderboard**

В `src/pages/Leaderboard.jsx`:

Импортировать: `import { calcPlayerStats, calcExtendedNominations, calcKillRate } from "../lib/metrics";`

Нужно передать `seasons` (уже есть в props).

В `ratingCalc` useMemo, добавить killRate к каждому игроку:

```javascript
const all = Array.from(playerIds).map((pid) => {
  const player = players.find((p) => p.id === pid);
  const stats = calcPlayerStats(pid, activeGames);
  const kr = calcKillRate(pid, activeGames, seasons);
  return {
    id: pid,
    nickname: player?.nickname || "?",
    ...stats,
    killRate: kr,
  };
});
```

Добавить столбец в columns:

```javascript
{ key: "killRate", label: "ПУ%", sortable: true },
```

Добавить ячейку:

```jsx
<td className="px-3 py-2.5 text-center text-xs">
  {row.killRate ? (
    <span className={
      row.killRate.killRate > 25 ? "text-red-500" :
      row.killRate.killRate < 10 ? "text-green-600" : ""
    }>
      {row.killRate.killRate.toFixed(1)}%
    </span>
  ) : "—"}
</td>
```

Аналогичную сортировку для killRate: `row.killRate?.killRate ?? -1`.

- [ ] **Step 2: Добавить столбец ПУ% в Dashboard рейтинг**

Аналогично Leaderboard — добавить killRate в ratingData и столбец в таблицу.

- [ ] **Step 3: Добавить KillRate в PlayerProfile**

StatCard (если killRate не null):

```jsx
{killRateData && (
  <StatCard label="ПУ%"
    value={
      <span className={
        killRateData.killRate > 25 ? "text-red-500" :
        killRateData.killRate < 10 ? "text-green-600" : ""
      }>
        {killRateData.killRate.toFixed(1)}%
        <span className="text-xs text-gray-400 ml-1">
          ({killRateData.timesKilled} из {killRateData.gamesTracked})
        </span>
      </span>
    }
  />
)}
```

В таблице ролей — столбец ПУ% используя `calcRoleKillRate`.

- [ ] **Step 4: Добавить KillRate в PlayerCompare**

Добавить строку в statRows:

```javascript
{ label: "KillRate", a: krA?.killRate ?? null, b: krB?.killRate ?? null, better: false, fmt: (v) => v != null ? `${v.toFixed(1)}%` : "—" },
```

(lower is better, поэтому `better: false` или инвертировать логику)

- [ ] **Step 5: Добавить бейдж ПУ в GameDetail**

В `src/pages/GameDetail.jsx`, в таблице игроков, если `game.firstKilled === gp.playerId`:

```jsx
{game.firstKilled === gp.playerId && (
  <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-xs font-medium">
    💀 ПУ
  </span>
)}
```

Добавить рядом с ником игрока.

- [ ] **Step 6: Проверить локально**

Проверка:
1. Создать сезон с trackFirstKill=true
2. Создать игру → на шаге 3 видны radio-кнопки ПУ
3. Отметить ПУ → сохранить → GameDetail показывает бейдж
4. Рейтинг/Профиль/Сравнение показывают KillRate

- [ ] **Step 7: Commit**

```bash
git add src/pages/Leaderboard.jsx src/pages/Dashboard.jsx src/pages/PlayerProfile.jsx src/pages/PlayerCompare.jsx src/pages/GameDetail.jsx
git commit -m "feat: display KillRate everywhere — rating, profile, compare, game detail"
```

---

## Chunk 5: Вкладка Турниры (Этап 8)

> **Важно:** Текущая модель использует `tournament_id` на играх (1:N). Спецификация хочет M:N (game может быть в нескольких турнирах). Для этого этапа: используем существующую 1:N модель (games → tournament_id). Турнирная страница фильтрует игры по `tournamentId`. Создание турниров — как сейчас (из GameForm) + новая форма на вкладке. M:N миграция — отдельный этап при необходимости.

### Task 13: SQL для notes поля в tournaments

**Files:**
- Create: `sql/008_tournament_notes.sql`

- [ ] **Step 1: Создать миграцию**

```sql
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS notes TEXT;
```

- [ ] **Step 2: Выполнить в Supabase SQL Editor**

- [ ] **Step 3: Обновить toFrontendTournament в queries.js**

```javascript
function toFrontendTournament(row) {
  return {
    id: row.id,
    seasonId: row.season_id,
    name: row.name,
    date: row.date,
    notes: row.notes || null,
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add sql/008_tournament_notes.sql src/lib/queries.js
git commit -m "feat: add notes field to tournaments"
```

---

### Task 14: Queries для турниров — расширение

**Files:**
- Modify: `src/lib/queries.js`

- [ ] **Step 1: Добавить getAllTournaments и updateTournament**

В `src/lib/queries.js`, секция Tournaments:

```javascript
export async function getAllTournaments() {
  const data = await rest('tournaments?select=*&order=date.desc');
  return data.map(toFrontendTournament);
}

export async function updateTournament(id, updates) {
  const body = {};
  if (updates.name !== undefined) body.name = updates.name;
  if (updates.date !== undefined) body.date = updates.date;
  if (updates.notes !== undefined) body.notes = updates.notes || null;
  const row = await rest(`tournaments?id=eq.${id}`, {
    method: 'PATCH',
    body,
    single: true,
  });
  return toFrontendTournament(row);
}
```

Также обновить `createTournament` чтобы принимать notes:

```javascript
export async function createTournament({ seasonId, name, date, notes }) {
  const row = await rest('tournaments', {
    method: 'POST',
    body: { season_id: seasonId, name, date, notes: notes || null },
    single: true,
  });
  return toFrontendTournament(row);
}
```

- [ ] **Step 2: Обновить App.jsx — загрузка всех турниров**

В `src/App.jsx`, добавить `allTournaments` state и refresh:

```javascript
const [allTournaments, setAllTournaments] = useState([]);

const refreshAllTournaments = useCallback(async () => {
  const data = await getAllTournaments();
  setAllTournaments(data);
  return data;
}, []);
```

Загрузить в useEffect и refreshData.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.js src/App.jsx
git commit -m "feat: tournament CRUD queries and allTournaments state"
```

---

### Task 15: Навигация — таб «Турниры»

**Files:**
- Modify: `src/lib/constants.js:1,50-56`
- Modify: `src/components/layout/TabBar.jsx:6-9`
- Modify: `src/App.jsx` (renderPage cases)

- [ ] **Step 1: Добавить таб в TABS**

В `src/lib/constants.js`:

Импорт: добавить `Award` в импорт lucide-react.

```javascript
import { LayoutDashboard, Trophy, Users, Settings, Sword, Award } from "lucide-react";
```

TABS: вставить между "rating" и "players":

```javascript
export const TABS = [
  { id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
  { id: "games", label: "Игры", icon: Sword },
  { id: "rating", label: "Рейтинг", icon: Trophy },
  { id: "tournaments", label: "Турниры", icon: Award },
  { id: "players", label: "Игроки", icon: Users },
  { id: "settings", label: "Настройки", icon: Settings },
];
```

- [ ] **Step 2: Обновить getIsActive в TabBar**

В `src/components/layout/TabBar.jsx`, строка 8:

```javascript
const getIsActive = (tabId) =>
  currentPage === tabId ||
  (tabId === "games" && ["gameDetail", "gameForm"].includes(currentPage)) ||
  (tabId === "players" && ["playerProfile", "compare"].includes(currentPage)) ||
  (tabId === "tournaments" && ["tournamentDetail", "tournamentForm"].includes(currentPage));
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.js src/components/layout/TabBar.jsx
git commit -m "feat: add Tournaments tab to navigation"
```

---

### Task 16: Страница TournamentList

**Files:**
- Create: `src/pages/TournamentList.jsx`

- [ ] **Step 1: Создать компонент TournamentList**

Создать `src/pages/TournamentList.jsx`:

```jsx
import { useState, useMemo } from "react";
import { Plus, Award } from "lucide-react";
import { Badge, EmptyState } from "../components/ui";
import { AdminOnly } from "../components/auth/AuthGuard";
import { formatDate } from "../lib/utils";

export function TournamentList({ tournaments, allTournaments, games, allGames, seasons, currentSeasonId, navigate }) {
  const [seasonFilter, setSeasonFilter] = useState("all");

  const activeTournaments = useMemo(() => {
    const list = seasonFilter === "all" ? allTournaments : (allTournaments || []).filter((t) => t.seasonId === seasonFilter);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [seasonFilter, allTournaments]);

  const getTournamentGames = (tournamentId) => {
    return (allGames || []).filter((g) => g.tournamentId === tournamentId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Турниры</h2>
        <AdminOnly>
          <button onClick={() => navigate("tournamentForm")}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm">
            <Plus size={14} /> Создать турнир
          </button>
        </AdminOnly>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="all">Все сезоны</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {activeTournaments.length === 0 ? (
        <EmptyState icon={Award} title="Нет турниров"
          description="Создайте первый турнир или добавьте турнир при создании игры" />
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-3 py-2.5 font-medium text-gray-500">Название</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-500">Дата</th>
                  <th className="text-center px-3 py-2.5 font-medium text-gray-500">Игр</th>
                  <th className="text-center px-3 py-2.5 font-medium text-gray-500">🔴</th>
                  <th className="text-center px-3 py-2.5 font-medium text-gray-500">⚫</th>
                </tr>
              </thead>
              <tbody>
                {activeTournaments.map((t) => {
                  const tGames = getTournamentGames(t.id);
                  const redWins = tGames.filter((g) => g.winner === "red").length;
                  const blackWins = tGames.length - redWins;
                  return (
                    <tr key={t.id}
                      className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate("tournamentDetail", t.id)}>
                      <td className="px-3 py-2.5 font-medium text-indigo-600">{t.name}</td>
                      <td className="px-3 py-2.5 text-gray-500">{formatDate(t.date)}</td>
                      <td className="px-3 py-2.5 text-center">{tGames.length}</td>
                      <td className="px-3 py-2.5 text-center text-red-600">{redWins}</td>
                      <td className="px-3 py-2.5 text-center">{blackWins}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/TournamentList.jsx
git commit -m "feat: TournamentList page component"
```

---

### Task 17: Страница TournamentDetail

**Files:**
- Create: `src/pages/TournamentDetail.jsx`

- [ ] **Step 1: Создать компонент TournamentDetail**

Создать `src/pages/TournamentDetail.jsx` — страница карточки турнира с:
- Шапка (название, дата, описание)
- Статистика (карточки: игры, красные победы, чёрные победы)
- Рейтинг турнира (таблица как в Leaderboard, порог >=50% игр)
- Номинации турнира (топ-5 по ролям)
- Список игр турнира
- Кнопки редактирования/удаления (AdminOnly)

Компонент использует:
- `calcPlayerStats`, `calcExtendedNominations`, `calcKillRate` из metrics.js
- Props: `tournament, allGames, players, navigate, seasons, goBack, showToast, refreshTournaments, refreshAllTournaments`

Фильтрация игр: `allGames.filter(g => g.tournamentId === tournament.id)`

Порог для рейтинга: `Math.floor(tournamentGames.length * 0.5)`

Минимум игр для номинаций: 1 (для коротких турниров)

```jsx
import { useState, useMemo } from "react";
import { ArrowLeft, Pencil, Trash2, Award } from "lucide-react";
import { StatCard, Badge, ConfirmDialog, EmptyState } from "../components/ui";
import { calcPlayerStats, calcExtendedNominations, calcKillRate } from "../lib/metrics";
import { NOMINATION_CONFIG, TEAM_NAMES, ROLE_NAMES, ROLE_BADGE_VARIANT } from "../lib/constants";
import { formatDate } from "../lib/utils";
import { AdminOnly } from "../components/auth/AuthGuard";
import { deleteTournament } from "../lib/queries";

export function TournamentDetail({
  tournament, allGames, players, navigate, seasons, goBack,
  showToast, refreshTournaments, refreshAllTournaments,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!tournament) {
    return <EmptyState icon={Award} title="Турнир не найден"
      action={<button onClick={() => goBack()} className="text-indigo-600 text-sm"><ArrowLeft size={16} className="inline mr-1" />Назад</button>} />;
  }

  const tournamentGames = useMemo(
    () => allGames.filter((g) => g.tournamentId === tournament.id),
    [allGames, tournament.id]
  );

  const totalGames = tournamentGames.length;
  const redWins = tournamentGames.filter((g) => g.winner === "red").length;
  const blackWins = totalGames - redWins;

  // Rating
  const ratingData = useMemo(() => {
    const playerIds = new Set();
    tournamentGames.forEach((g) => g.players.forEach((p) => playerIds.add(p.playerId)));
    const minGames = Math.max(1, Math.floor(totalGames * 0.5));

    return Array.from(playerIds).map((pid) => {
      const player = players.find((p) => p.id === pid);
      const stats = calcPlayerStats(pid, tournamentGames);
      const kr = calcKillRate(pid, tournamentGames, seasons);
      return { id: pid, nickname: player?.nickname || "?", ...stats, killRate: kr };
    }).filter((p) => p.totalGames >= minGames)
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [tournamentGames, players, seasons]);

  // Nominations (min 1 game per role for short tournaments)
  const { nominations } = useMemo(() => {
    // Custom: override minGames to 1
    const roles = ["citizen", "sheriff", "mafia", "don"];
    const result = {};
    for (const role of roles) {
      const playerScores = [];
      for (const player of players) {
        const roleGames = tournamentGames.flatMap((g) =>
          g.players.filter((p) => p.playerId === player.id && p.role === role)
        );
        if (roleGames.length < 1) continue;
        const wins = roleGames.filter((p) => p.result === "win").length;
        const totalScore = roleGames.reduce((sum, p) => sum + p.totalScore, 0);
        const totalBonus = roleGames.reduce((sum, p) => sum + p.bonusScore, 0);
        playerScores.push({
          playerId: player.id, nickname: player.nickname,
          games: roleGames.length, wins,
          winrate: (wins / roleGames.length) * 100,
          avgScore: totalScore / roleGames.length,
          avgBonus: totalBonus / roleGames.length,
        });
      }
      result[role] = playerScores.sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
    }
    return { nominations: result };
  }, [tournamentGames, players]);

  const handleDelete = async () => {
    try {
      await deleteTournament(tournament.id);
      await refreshTournaments?.();
      await refreshAllTournaments?.();
      showToast?.(`Турнир «${tournament.name}» удалён`);
      goBack();
    } catch (err) {
      showToast?.("Ошибка: " + (err.message || "неизвестная ошибка"));
    }
  };

  const medalEmoji = (idx) => idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => goBack()} className="p-1.5 hover:bg-gray-100 rounded transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold">{tournament.name}</h2>
          <p className="text-sm text-gray-500">{formatDate(tournament.date)}</p>
        </div>
      </div>

      {tournament.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          {tournament.notes}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Всего игр" value={totalGames} />
        <div className="bg-white rounded-xl shadow-sm p-4">
          <span className="text-sm text-gray-500">Красные</span>
          <div className="text-2xl font-bold text-red-600">
            {redWins} <span className="text-base font-normal text-red-400">
              ({totalGames > 0 ? ((redWins / totalGames) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <span className="text-sm text-gray-500">Чёрные</span>
          <div className="text-2xl font-bold text-gray-800">
            {blackWins} <span className="text-base font-normal text-gray-400">
              ({totalGames > 0 ? ((blackWins / totalGames) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Rating table */}
      {ratingData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold mb-3">Рейтинг турнира</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-2 py-2 text-center font-medium text-gray-500">#</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Ник</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">Игры</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">Побед</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">WR%</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">Баллы</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">Ср. балл</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500">Ср. доп.</th>
                </tr>
              </thead>
              <tbody>
                {ratingData.map((row, idx) => (
                  <tr key={row.id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-2 py-2 text-center font-medium">{medalEmoji(idx)}</td>
                    <td className="px-2 py-2 font-medium">
                      <button onClick={() => navigate("playerProfile", row.id)}
                        className="text-indigo-600 hover:underline">{row.nickname}</button>
                    </td>
                    <td className="px-2 py-2 text-center">{row.totalGames}</td>
                    <td className="px-2 py-2 text-center">{row.wins}</td>
                    <td className="px-2 py-2 text-center">{row.winrate.toFixed(0)}%</td>
                    <td className="px-2 py-2 text-center font-semibold">
                      {row.totalScore % 1 === 0 ? row.totalScore : row.totalScore.toFixed(1)}
                    </td>
                    <td className="px-2 py-2 text-center">{row.avgScore.toFixed(2)}</td>
                    <td className="px-2 py-2 text-center">
                      <span className={row.avgBonus > 0 ? "text-green-600" : row.avgBonus < 0 ? "text-red-500" : ""}>
                        {row.avgBonus.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Nominations */}
      {totalGames > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Номинации турнира</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {NOMINATION_CONFIG.map(({ role, emoji, label }) => {
              const top = nominations[role] || [];
              if (top.length === 0) return null;
              return (
                <div key={role} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="font-semibold mb-2">{emoji} {label}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1 font-medium text-gray-500">#</th>
                          <th className="text-left py-1 font-medium text-gray-500">Ник</th>
                          <th className="text-center py-1 font-medium text-gray-500">Игр</th>
                          <th className="text-center py-1 font-medium text-gray-500">Побед</th>
                          <th className="text-center py-1 font-medium text-gray-500">WR%</th>
                          <th className="text-center py-1 font-medium text-gray-500">Ср. балл</th>
                          <th className="text-center py-1 font-medium text-gray-500">Ср. доп.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {top.map((p, i) => (
                          <tr key={p.playerId} className="border-b last:border-b-0">
                            <td className="py-1">{i + 1}</td>
                            <td className="py-1">
                              <button onClick={() => navigate("playerProfile", p.playerId)}
                                className="text-indigo-600 hover:underline">{p.nickname}</button>
                            </td>
                            <td className="py-1 text-center">{p.games}</td>
                            <td className="py-1 text-center">{p.wins}</td>
                            <td className="py-1 text-center">{p.winrate.toFixed(0)}%</td>
                            <td className="py-1 text-center">{p.avgScore.toFixed(2)}</td>
                            <td className="py-1 text-center">
                              <span className={p.avgBonus > 0 ? "text-green-600" : p.avgBonus < 0 ? "text-red-500" : ""}>
                                {p.avgBonus > 0 ? "+" : ""}{p.avgBonus.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Game list */}
      {tournamentGames.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold mb-3">Игры турнира</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-center px-2 py-2 font-medium text-gray-500">№</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-500">Дата</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-500">Победитель</th>
                </tr>
              </thead>
              <tbody>
                {tournamentGames.sort((a, b) => a.gameNumber - b.gameNumber).map((g) => (
                  <tr key={g.id} className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate("gameDetail", g.id)}>
                    <td className="px-2 py-2 text-center font-medium">#{g.gameNumber}</td>
                    <td className="px-2 py-2 text-gray-500">{formatDate(g.date)}</td>
                    <td className="px-2 py-2">
                      <Badge variant={g.winner === "red" ? "red" : "black"}>
                        {TEAM_NAMES[g.winner]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <AdminOnly>
        <div className="flex gap-2">
          <button onClick={() => navigate("tournamentForm", tournament.id)}
            className="flex items-center gap-1.5 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
            <Pencil size={14} /> Редактировать
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm">
            <Trash2 size={14} /> Удалить
          </button>
        </div>
      </AdminOnly>

      {confirmDelete && (
        <ConfirmDialog title="Удалить турнир?"
          message={`Турнир «${tournament.name}» будет удалён. Игры останутся.`}
          onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)}
          confirmText="Удалить" danger />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/TournamentDetail.jsx
git commit -m "feat: TournamentDetail page with rating, nominations, game list"
```

---

### Task 18: Страница TournamentForm

**Files:**
- Create: `src/pages/TournamentForm.jsx`

- [ ] **Step 1: Создать компонент TournamentForm**

Форма создания/редактирования турнира: название, дата, сезон, описание.

```jsx
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { createTournament, updateTournament } from "../lib/queries";

export function TournamentForm({
  seasons, currentSeasonId, navigate, goBack,
  editingTournament, showToast, refreshTournaments, refreshAllTournaments,
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [seasonId, setSeasonId] = useState(currentSeasonId || "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editingTournament) {
      setName(editingTournament.name);
      setDate(editingTournament.date);
      setSeasonId(editingTournament.seasonId);
      setNotes(editingTournament.notes || "");
    }
  }, [editingTournament]);

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (editingTournament) {
        await updateTournament(editingTournament.id, {
          name: name.trim(),
          date,
          notes: notes.trim() || null,
        });
        showToast?.("Турнир обновлён");
        goBack();
      } else {
        const t = await createTournament({
          seasonId,
          name: name.trim(),
          date,
          notes: notes.trim() || null,
        });
        showToast?.(`Турнир «${t.name}» создан`);
        navigate("tournamentDetail", t.id);
      }
      await refreshTournaments?.();
      await refreshAllTournaments?.();
    } catch (err) {
      showToast?.("Ошибка: " + (err.message || "неизвестная ошибка"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => goBack()} className="p-1.5 hover:bg-gray-100 rounded transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold">
          {editingTournament ? "Редактирование турнира" : "Новый турнир"}
        </h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название <span className="text-red-500">*</span>
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Кубок клуба — Март 2026" autoFocus />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {!editingTournament && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сезон</label>
            <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.isActive ? " (активен)" : ""}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Необязательно" />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={!name.trim()}
          className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-sm">
          <Check size={16} /> {editingTournament ? "Сохранить" : "Создать турнир"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/TournamentForm.jsx
git commit -m "feat: TournamentForm page for create/edit"
```

---

### Task 19: Интеграция в App.jsx — routing

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Импортировать новые страницы**

```javascript
import { TournamentList } from "./pages/TournamentList";
import { TournamentDetail } from "./pages/TournamentDetail";
import { TournamentForm } from "./pages/TournamentForm";
import { getAllTournaments } from "./lib/queries";
```

- [ ] **Step 2: Добавить allTournaments state и refresh**

После `tournaments` state:

```javascript
const [allTournaments, setAllTournaments] = useState([]);
```

```javascript
const refreshAllTournaments = useCallback(async () => {
  const data = await getAllTournaments();
  setAllTournaments(data);
  return data;
}, []);
```

Загрузить в useEffect (после `getAllGames()`):

```javascript
const allT = await getAllTournaments();
if (!cancelled) setAllTournaments(allT);
```

В refreshData:

```javascript
const allT = await getAllTournaments();
setAllTournaments(allT);
```

- [ ] **Step 3: Добавить cases в renderPage**

```jsx
case "tournaments":
  return (
    <TournamentList
      tournaments={tournaments}
      allTournaments={allTournaments}
      games={games}
      allGames={allGames}
      seasons={seasons}
      currentSeasonId={currentSeasonId}
      navigate={navigate}
    />
  );

case "tournamentDetail":
  return (
    <TournamentDetail
      tournament={allTournaments.find((t) => t.id === selectedId)}
      allGames={allGames}
      players={players}
      navigate={navigate}
      seasons={seasons}
      goBack={goBack}
      showToast={showToast}
      refreshTournaments={refreshTournaments}
      refreshAllTournaments={refreshAllTournaments}
    />
  );

case "tournamentForm":
  return (
    <TournamentForm
      seasons={seasons}
      currentSeasonId={currentSeasonId}
      navigate={navigate}
      goBack={goBack}
      editingTournament={selectedId ? allTournaments.find((t) => t.id === selectedId) : null}
      showToast={showToast}
      refreshTournaments={refreshTournaments}
      refreshAllTournaments={refreshAllTournaments}
    />
  );
```

- [ ] **Step 4: Проверить локально**

Проверка:
1. Таб "Турниры" появился в навигации
2. Список турниров отображается
3. Клик на турнир → детальная страница с рейтингом и номинациями
4. Создание нового турнира работает
5. Редактирование и удаление работают
6. Кнопка «Назад» возвращает правильно

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/pages/TournamentList.jsx src/pages/TournamentDetail.jsx src/pages/TournamentForm.jsx
git commit -m "feat: Tournaments tab — list, detail, form, full integration"
```

---

## Финальная проверка

- [ ] **Полная проверка всех функций**

Run: `npm run dev`

Чеклист:
1. Header: "Iron Maf" с placeholder IM
2. Рейтинг: столбцы "Ср. доп." и "ПУ%", номинации топ-5 под таблицей
3. Дашборд: столбец "Ср. доп." и "ПУ%" в рейтинге
4. Профиль: StatCard "Ср. доп." и "ПУ%", столбцы в таблице ролей
5. Сравнение: строки "Ср. доп." и "KillRate", формат пар `games / wins (wr%)`
6. Профиль пары: формат `games / wins (wr%)`
7. Кнопка «Назад»: возвращает откуда пришли
8. GameForm шаг 3: radio для ПУ (при trackFirstKill сезона)
9. GameDetail: бейдж ПУ у первоубиенного
10. Настройки: чекбокс trackFirstKill при создании сезона
11. Турниры: список, детальная страница, создание, удаление

- [ ] **Финальный build-тест**

Run: `npm run build`

Убедиться что нет ошибок сборки.

- [ ] **Финальный commit (если были мелкие правки)**

```bash
git add -A
git commit -m "fix: final adjustments after full QA"
```
