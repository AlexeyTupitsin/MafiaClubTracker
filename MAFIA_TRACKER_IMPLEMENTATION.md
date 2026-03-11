# Mafia Club Tracker — Полная документация и план реализации

## Контекст для LLM

> Этот документ — полная спецификация веб-приложения для учёта игр в спортивную мафию.
> Используй его как единственный источник требований. Реализуй приложение как **один React-артефакт (.jsx)**,
> который можно запустить в Claude Artifacts. Все данные хранятся через `window.storage` API (Persistent Storage).
> Данные привязаны к артефакту и **доступны всем по ссылке** (shared storage).
> Ведущий вносит данные, игроки открывают ссылку и смотрят рейтинг/статистику.
> Интерфейс полностью на **русском языке**. Стилизация — **Tailwind CSS** (только core utility classes).
> Доступные библиотеки: `react`, `recharts`, `lucide-react`, `lodash`.

---

## 1. Суть проекта

Веб-приложение для мафия-клуба:

- Ведение реестра игроков клуба
- Регистрация игр с указанием ролей, результата и дополнительных баллов
- Автоматический расчёт рейтинга и статистики
- Разделение данных по сезонам
- Аналитика: статистика по ролям, по парам игроков (одноцвет/разноцвет)

---

## 2. Правила спортивной мафии (для контекста)

### 2.1. Состав стола

Всегда **10 игроков** за столом. Места пронумерованы 1–10.

### 2.2. Роли

| Роль | Кол-во | Команда | Код в системе |
|------|--------|---------|---------------|
| Мирный житель | 6 | Красные (red) | `citizen` |
| Шериф | 1 | Красные (red) | `sheriff` |
| Мафия | 2 | Чёрные (black) | `mafia` |
| Дон мафии | 1 | Чёрные (black) | `don` |

### 2.3. Команды

- **Красные (red team):** `citizen` + `sheriff` = 7 человек
- **Чёрные (black team):** `mafia` + `don` = 3 человека

### 2.4. Результат

Игра заканчивается победой одной из команд: `red` или `black`.
Каждый игрок автоматически получает `win` или `lose` в зависимости от своей команды и победителя.

### 2.5. Система баллов

- **Победа** = 1 базовый балл (`baseScore = 1`)
- **Поражение** = 0 базовых баллов (`baseScore = 0`)
- **Дополнительные баллы** (`bonusScore`) — вводятся ведущим вручную. Могут быть положительными (бонус за лучший ход, MVP и т.д.) или отрицательными (штрафы, фолы)
- **Итого** = `totalScore = baseScore + bonusScore`

---

## 3. Модель данных

### 3.1. Season (Сезон)

```typescript
interface Season {
  id: string;           // UUID v4
  name: string;         // "Сезон 1 — Весна 2026"
  startDate: string;    // ISO date "2026-03-01"
  endDate: string | null; // null = активный сезон
  isActive: boolean;    // только один сезон может быть активным
}
```

### 3.2. Player (Игрок)

```typescript
interface Player {
  id: string;           // UUID v4
  nickname: string;     // уникальный игровой ник
  realName: string | null; // настоящее имя (опционально)
  createdAt: string;    // ISO datetime
  isActive: boolean;    // false = деактивирован (не показывать в выборе)
}
```

### 3.3. Game (Игра)

```typescript
interface Game {
  id: string;           // UUID v4
  seasonId: string;     // ссылка на Season.id
  gameNumber: number;   // порядковый номер в сезоне (auto-increment)
  date: string;         // ISO datetime
  winner: "red" | "black"; // победитель
  players: GamePlayer[]; // ровно 10 элементов
  notes: string | null;  // комментарий ведущего
  createdAt: string;    // ISO datetime
}
```

### 3.4. GamePlayer (Участник игры)

```typescript
interface GamePlayer {
  playerId: string;     // ссылка на Player.id
  seat: number;         // 1–10, уникальное в рамках игры
  role: "citizen" | "mafia" | "sheriff" | "don";
  result: "win" | "lose"; // вычисляется автоматически
  baseScore: number;    // 1 (победа) или 0 (поражение)
  bonusScore: number;   // доп. баллы от ведущего (может быть отрицательным)
  bonusComment: string | null; // комментарий к доп. баллам
  totalScore: number;   // baseScore + bonusScore
}
```

### 3.5. Вспомогательная функция определения команды

```typescript
function getTeam(role: string): "red" | "black" {
  return (role === "citizen" || role === "sheriff") ? "red" : "black";
}
```

---

## 4. Схема хранения данных

Используется `window.storage` API (Persistent Storage в Claude Artifacts).

### 4.1. Ключи хранилища

| Ключ | Тип значения | Описание |
|------|-------------|----------|
| `seasons` | `JSON.stringify(Season[])` | Все сезоны |
| `players` | `JSON.stringify(Player[])` | Все игроки |
| `games:SEASON_ID` | `JSON.stringify(Game[])` | Игры конкретного сезона |

### 4.2. API работы с хранилищем

**Все операции используют `shared: true`** — данные видны всем, кто откроет артефакт по ссылке.

```javascript
// Чтение
const result = await window.storage.get("seasons", true);
const seasons = result ? JSON.parse(result.value) : [];

// Запись
await window.storage.set("seasons", JSON.stringify(seasons), true);

// Удаление
await window.storage.delete("games:" + seasonId, true);

// Список ключей
const keys = await window.storage.list("games:", true);
```

### 4.3. Важные ограничения

- Все операции асинхронные, всегда оборачивать в `try/catch`
- Максимум 5 МБ на ключ
- Ключи без пробелов, кавычек и слешей
- При чтении несуществующего ключа — `catch` (не `null`)
- Минимизировать количество вызовов: читать/писать пакетно

### 4.4. Паттерн загрузки данных

```javascript
// При старте приложения загружаем seasons и players (один раз)
// При переключении сезона загружаем games:SEASON_ID
// При сохранении игры пишем весь массив games текущего сезона
```

---

## 5. Экраны и навигация

### 5.1. Общий Layout

- **Шапка (Header):** название приложения + селектор текущего сезона (dropdown)
- **Навигация (TabBar):** горизонтальные табы — Дашборд, Игры, Рейтинг, Игроки, Настройки
- **Контент:** основная область под навигацией
- Поддержка внутренней навигации через состояние (SPA без react-router, используем useState для текущего экрана)

### 5.2. Дашборд (главная)

**Назначение:** полная сводка клуба.

**Фильтр сезона:** выпадающий список в верхней части. По умолчанию — «Все сезоны». Можно выбрать конкретный.

**Карточки-метрики:**
- Всего игр (число)
- Побед красных: количество + процент (напр. «34 (57%)»)
- Побед чёрных: количество + процент (напр. «26 (43%)»)

**Рейтинг (основная таблица):**
- Полная таблица рейтинга (как на вкладке «Рейтинг») — место, ник, игры, победы, winrate, баллы, ср. балл
- Порог: ≥50% игр (округление вниз)
- Кнопка «Показать всех» / «Только прошедшие порог»
- Сортировка по столбцам

**Номинации (топ-3 по среднему баллу за роль):**
4 карточки-номинации, каждая показывает топ-3 игроков:
- 🏛️ **Лучший мирный** — топ-3 по среднему баллу в играх за citizen
- 🛡️ **Лучший шериф** — топ-3 по среднему баллу за sheriff
- 🔫 **Лучший мафиози** — топ-3 по среднему баллу за mafia
- 👑 **Лучший дон** — топ-3 по среднему баллу за don

Условие попадания в номинацию: минимум 3 игры за эту роль (чтобы один удачный раз не давал первое место).
Формат карточки:
```
🛡️ Лучший шериф
1. Вася — 1.45 ср. (11 игр)
2. Петя — 1.20 ср. (8 игр)
3. Маша — 1.10 ср. (6 игр)
```

**Кнопка «+ Добавить игру»** → переход на экран добавления

### 5.3. Игры

**Список игр:**
- По умолчанию показываются игры **всех сезонов** (сортировка: новые сверху)
- Таблица: №, сезон, дата, победитель (цветной бейдж red/black), 10 ников кратко

**Фильтры:**
- **По сезону:** выпадающий список — «Все сезоны» (по умолчанию) / конкретный сезон
- **По победителю:** кнопки — все / красные / чёрные
- **По игроку:** выпадающий список игроков — «Все» / конкретный ник. Показывает только игры, где участвовал выбранный игрок
- Фильтры комбинируются (напр. «Сезон 2 + чёрные победили + участвовал Вася»)

- Клик на строку → детальный просмотр игры (GameDetail)
- Кнопка «+ Добавить игру» → форма (GameForm)
- Кнопка «Из предыдущей игры» — копирует участников последней игры на шаге 1

**GameDetail (просмотр игры):**
- Шапка: игра №N, дата, победитель
- Таблица 10 игроков: место, ник, роль (с иконкой/цветом), результат, базовый балл, бонус, итого, комментарий
- Кнопки: редактировать, удалить (с подтверждением)
- Кнопка «Назад к списку»

**GameForm (добавление/редактирование игры) — мастер из 3 шагов:**

**Шаг 1: Выбор игроков и рассадка**
- Визуальное представление стола (10 мест по кругу или в ряд)
- Каждому месту (1–10) назначается игрок из dropdown-списка активных игроков
- Выбранные игроки исключаются из списка для других мест
- Валидация: все 10 мест заполнены уникальными игроками

**Шаг 2: Назначение ролей и результат**
- Рядом с каждым местом/ником — выпадающий список роли
- Валидация состава ролей: ровно 6 citizen, 2 mafia, 1 sheriff, 1 don
- Показывать счётчик ролей в реальном времени (6/6, 2/2, 1/1, 1/1) с подсветкой ошибок
- Выбор победителя: два больших переключателя «Красные победили» / «Чёрные победили»

**Шаг 3: Дополнительные баллы**
- Таблица 10 игроков: место, ник, роль, результат (auto), baseScore (auto), поле ввода bonusScore, поле ввода комментария
- Результат и baseScore вычисляются автоматически на основе роли + победителя
- Поле для общего комментария к игре (notes)
- Кнопка «Сохранить игру»

### 5.4. Рейтинг / Лидерборд

**Таблица рейтинга** со всеми игроками, участвовавшими хотя бы в 1 игре:

| Столбец | Описание |
|---------|----------|
| # | Место в рейтинге |
| Ник | nickname (клик → профиль) |
| Игры | Количество игр |
| Победы | Количество побед |
| Winrate % | (победы / игры) × 100 |
| Баллы | Сумма totalScore |
| Ср. балл | Баллы / Игры |

- Сортировка по умолчанию: по сумме баллов (убывание)
- Клик на заголовок столбца → сортировка по нему
- Переключатель: «Текущий сезон» / «Все сезоны» / конкретный сезон из списка

### 5.5. Профиль игрока (PlayerProfile)

Открывается при клике на ника в рейтинге или списке игроков.

**Блок 1: Общая статистика**
- Всего игр, побед, winrate, общие баллы, средний балл

**Блок 2: Статистика по ролям**
Таблица:
| Роль | Игр | Побед | Winrate % | Ср. балл |
|------|-----|-------|-----------|----------|
| Мирный | ... | ... | ... | ... |
| Шериф | ... | ... | ... | ... |
| Мафия | ... | ... | ... | ... |
| Дон | ... | ... | ... | ... |

Визуализация: горизонтальные бары или RadarChart (Recharts).

**Блок 3: Статистика по парам**
Таблица: для каждого другого игрока, с которым были совместные игры:

| Партнёр | Игр вместе | Вместе 🔴 (игр / побед / WR%) | Вместе ⚫ (игр / побед / WR%) | A🔴 B⚫ (игр / побед A / WR% A) | A⚫ B🔴 (игр / побед A / WR% A) |
|---------|-----------|-------------------------------|-------------------------------|--------------------------------|--------------------------------|

**4 комбинации для пары игроков (A — текущий, B — партнёр):**

- **Вместе красные (bothRed):** оба в красной команде (citizen/sheriff). Побед = когда red победили. WR% = побед / игр.
- **Вместе чёрные (bothBlack):** оба в чёрной команде (mafia/don). Побед = когда black победили. WR% = побед / игр.
- **A красный, B чёрный (aRedBBlack):** A в красных, B в чёрных. Побед A = когда red победили. WR% A = побед A / игр.
- **A чёрный, B красный (aBlackBRed):** A в чёрных, B в красных. Побед A = когда black победили. WR% A = побед A / игр.

Сортировка по количеству совместных игр (убывание).

> **Примечание для UI:** на мобильном эта таблица широкая — использовать горизонтальный скролл или свернуть в аккордеон по партнёру.

**Блок 4: Тренд формы (последние 10 игр)**
- Мини-блок: winrate за последние 10 игр vs winrate за всё время
- Визуализация: цветной индикатор
  - 🟢 «На подъёме» — winrate последних 10 > общего winrate на 10%+
  - 🟡 «Стабильно» — разница < 10%
  - 🔴 «В спаде» — winrate последних 10 < общего winrate на 10%+
- Показывать последние 10 результатов в виде строки: ✅❌✅✅✅❌✅✅✅✅
- Средний балл за последние 10 игр vs общий средний

**Блок 5: График динамики**
- LineChart (Recharts): ось X = игра №, ось Y = cumulative totalScore
- Показывает накопление баллов по ходу сезона

**Блок 6: История игр**
- Список игр этого игрока: №, дата, роль, результат, баллы

### 5.6. Сравнение игроков

**Новый экран.** Доступ: кнопка «Сравнить» на странице рейтинга или профиля.

**Выбор:** два dropdown'а для выбора игрока A и игрока B.

**Содержимое (бок о бок):**

| Метрика | Игрок A | Игрок B |
|---------|---------|---------|
| Игры | ... | ... |
| Победы | ... | ... |
| Winrate % | ... | ... |
| Баллы | ... | ... |
| Ср. балл | ... | ... |

- Лучшие значения подсвечиваются зелёным
- Статистика по ролям бок о бок (BarChart с двумя сериями)
- **Head-to-head:** статистика из игр, где оба участвовали:
  - Всего совместных игр
  - Вместе красные / вместе чёрные / A🔴 B⚫ / A⚫ B🔴 (как в парах)
- **Тренд формы** обоих рядом (последние 10 игр)

Расчёт: использует те же `calcPlayerStats`, `calcRoleStats`, `calcPairStats` + данные формы.

### 5.7. Управление игроками (PlayerList)

- Таблица всех игроков: ник, имя, дата регистрации, статус (активен/неактивен), кол-во игр
- Кнопка «+ Добавить игрока» → модальное окно с полями nickname (обязательно) и realName (опционально)
- Редактирование: клик на строку → модальное окно
- Деактивация: переключатель isActive. Деактивированные отображаются серым. Нельзя деактивировать, пока не подтвердишь
- Клик на ник → переход в профиль игрока

### 5.8. Управление сезонами

Встроено в Настройки или как отдельный блок:
- Список сезонов: название, даты, статус, кол-во игр
- «+ Новый сезон»: название + дата начала. Новый сезон автоматически становится активным, предыдущий завершается
- Завершение сезона: устанавливает endDate, снимает isActive
- Удаление: только если нет игр в сезоне

### 5.9. Настройки

- **Экспорт данных:** кнопка → скачивает JSON со всеми seasons, players, games
- **Импорт данных:** загрузка JSON-файла → восстановление всех данных (с подтверждением перезаписи)
- **Сброс всех данных:** кнопка с двойным подтверждением

---

## 6. Вычисляемые метрики (все считаются на лету)

### 6.1. Метрики игрока

```javascript
function calcPlayerStats(playerId, games) {
  const playerGames = games.flatMap(g =>
    g.players.filter(p => p.playerId === playerId).map(p => ({ ...p, game: g }))
  );

  const totalGames = playerGames.length;
  const wins = playerGames.filter(p => p.result === "win").length;
  const totalScore = playerGames.reduce((sum, p) => sum + p.totalScore, 0);

  return {
    totalGames,
    wins,
    losses: totalGames - wins,
    winrate: totalGames > 0 ? (wins / totalGames * 100) : 0,
    totalScore,
    avgScore: totalGames > 0 ? (totalScore / totalGames) : 0,
  };
}
```

### 6.2. Метрики по ролям

```javascript
function calcRoleStats(playerId, games) {
  const roles = ["citizen", "sheriff", "mafia", "don"];
  return roles.map(role => {
    const roleGames = games.flatMap(g =>
      g.players.filter(p => p.playerId === playerId && p.role === role)
        .map(p => ({ ...p, game: g }))
    );
    const total = roleGames.length;
    const wins = roleGames.filter(p => p.result === "win").length;
    const score = roleGames.reduce((sum, p) => sum + p.totalScore, 0);
    return {
      role,
      games: total,
      wins,
      winrate: total > 0 ? (wins / total * 100) : 0,
      avgScore: total > 0 ? (score / total) : 0,
    };
  });
}
```

### 6.3. Метрики пар

```javascript
function getTeam(role) {
  return (role === "citizen" || role === "sheriff") ? "red" : "black";
}

function calcPairStats(playerIdA, playerIdB, games) {
  // Находим игры, где оба участвовали
  const sharedGames = games.filter(g => {
    const ids = g.players.map(p => p.playerId);
    return ids.includes(playerIdA) && ids.includes(playerIdB);
  });

  // 4 комбинации
  let bothRed = { games: 0, wins: 0 };       // оба красные
  let bothBlack = { games: 0, wins: 0 };     // оба чёрные
  let aRedBBlack = { games: 0, winsA: 0 };   // A красный, B чёрный
  let aBlackBRed = { games: 0, winsA: 0 };   // A чёрный, B красный

  for (const g of sharedGames) {
    const a = g.players.find(p => p.playerId === playerIdA);
    const b = g.players.find(p => p.playerId === playerIdB);
    const teamA = getTeam(a.role);
    const teamB = getTeam(b.role);

    if (teamA === "red" && teamB === "red") {
      bothRed.games++;
      if (g.winner === "red") bothRed.wins++;
    } else if (teamA === "black" && teamB === "black") {
      bothBlack.games++;
      if (g.winner === "black") bothBlack.wins++;
    } else if (teamA === "red" && teamB === "black") {
      aRedBBlack.games++;
      if (g.winner === "red") aRedBBlack.winsA++;
    } else if (teamA === "black" && teamB === "red") {
      aBlackBRed.games++;
      if (g.winner === "black") aBlackBRed.winsA++;
    }
  }

  const wr = (wins, total) => total > 0 ? (wins / total * 100) : 0;

  return {
    totalGames: sharedGames.length,
    bothRed: {
      ...bothRed,
      winrate: wr(bothRed.wins, bothRed.games),
    },
    bothBlack: {
      ...bothBlack,
      winrate: wr(bothBlack.wins, bothBlack.games),
    },
    aRedBBlack: {
      ...aRedBBlack,
      winrateA: wr(aRedBBlack.winsA, aRedBBlack.games),
    },
    aBlackBRed: {
      ...aBlackBRed,
      winrateA: wr(aBlackBRed.winsA, aBlackBRed.games),
    },
  };
}
```

**Подписи столбцов в таблице (русский):**

| Код | Подпись в UI |
|-----|-------------|
| `bothRed` | Вместе красные 🔴🔴 |
| `bothBlack` | Вместе чёрные ⚫⚫ |
| `aRedBBlack` | Я 🔴 Он ⚫ |
| `aBlackBRed` | Я ⚫ Он 🔴 |

### 6.4. Метрики дашборда

```javascript
function calcDashboardStats(games) {
  const total = games.length;
  const redWins = games.filter(g => g.winner === "red").length;
  const blackWins = total - redWins;

  return {
    totalGames: total,
    redWins,
    blackWins,
    redWinrate: total > 0 ? (redWins / total * 100) : 0,
    blackWinrate: total > 0 ? (blackWins / total * 100) : 0,
  };
}
```

### 6.5. Номинации (топ-3 по роли)

```javascript
// Минимум игр за роль для попадания в номинацию
const MIN_GAMES_FOR_NOMINATION = 3;

function calcRoleNominations(games, players) {
  const roles = ["citizen", "sheriff", "mafia", "don"];
  const result = {};

  for (const role of roles) {
    // Собираем средний балл каждого игрока за эту роль
    const playerScores = [];

    for (const player of players) {
      const roleGames = games.flatMap(g =>
        g.players.filter(p => p.playerId === player.id && p.role === role)
      );
      if (roleGames.length < MIN_GAMES_FOR_NOMINATION) continue;

      const totalScore = roleGames.reduce((sum, p) => sum + p.totalScore, 0);
      const avgScore = totalScore / roleGames.length;

      playerScores.push({
        playerId: player.id,
        nickname: player.nickname,
        games: roleGames.length,
        avgScore,
      });
    }

    // Сортируем по среднему баллу, берём топ-3
    result[role] = playerScores
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3);
  }

  return result;
  // Формат: { citizen: [{nickname, games, avgScore}, ...], sheriff: [...], ... }
}
```

### 6.6. Тренд формы (последние N игр)

```javascript
function calcFormTrend(playerId, games, lastN = 10) {
  // Все игры этого игрока, отсортированные по дате/номеру
  const playerGames = games
    .filter(g => g.players.some(p => p.playerId === playerId))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (playerGames.length === 0) return null;

  const allStats = calcPlayerStats(playerId, games);

  // Последние N игр
  const recentGames = playerGames.slice(-lastN);
  const recentStats = calcPlayerStats(playerId, recentGames);

  // Строка результатов: массив "win"/"lose" для последних N
  const recentResults = recentGames.map(g => {
    const gp = g.players.find(p => p.playerId === playerId);
    return gp.result;
  });

  // Определяем тренд
  const diff = recentStats.winrate - allStats.winrate;
  let trend;
  if (diff > 10) trend = "up";       // на подъёме
  else if (diff < -10) trend = "down"; // в спаде
  else trend = "stable";              // стабильно

  return {
    recentGames: recentGames.length,
    recentWinrate: recentStats.winrate,
    recentAvgScore: recentStats.avgScore,
    overallWinrate: allStats.winrate,
    overallAvgScore: allStats.avgScore,
    recentResults,  // ["win", "lose", "win", ...]
    trend,          // "up" | "stable" | "down"
    diff,           // разница в winrate
  };
}
```

---

## 7. Бизнес-логика и валидация

### 7.1. Создание игры — валидация

```
✅ Ровно 10 игроков — не больше, не меньше
✅ Каждый playerId уникален в рамках игры
✅ Каждый seat (1–10) уникален
✅ Ровно 6 citizen + 2 mafia + 1 sheriff + 1 don
✅ Указан winner (red или black)
✅ result каждого игрока вычислен: getTeam(role) === winner ? "win" : "lose"
✅ baseScore: result === "win" ? 1 : 0
✅ totalScore = baseScore + bonusScore
✅ gameNumber = max(gameNumber в текущем сезоне) + 1
✅ Игра привязана к активному сезону
```

### 7.2. Управление игроками

```
✅ nickname — обязательное, уникальное (case-insensitive)
✅ Удаление игрока невозможно если он участвовал хотя бы в 1 игре → только деактивация
✅ Деактивированный игрок не отображается в dropdown при создании игры
✅ Деактивированный игрок сохраняется в рейтинге и статистике
```

### 7.3. Управление сезонами

```
✅ Только один активный сезон одновременно
✅ При создании нового — предыдущий активный завершается (endDate = now)
✅ Удаление сезона возможно только если в нём 0 игр
✅ Новые игры можно добавлять только в активный сезон
```

### 7.4. Удаление и редактирование игры

```
✅ Удаление — с подтверждением ("Удалить игру №N?")
✅ При удалении пересчитываются все метрики (они вычисляются на лету, ничего пересчитывать не надо)
✅ Редактирование — открывает ту же форму из 3 шагов, предзаполненную данными
```

---

## 8. UI / UX детали

### 8.1. Цветовая схема

| Элемент | Цвет |
|---------|------|
| Красная команда (red) | `bg-red-500`, `text-red-600` |
| Чёрная команда (black) | `bg-gray-800`, `text-gray-900` |
| Победа | `text-green-600`, `bg-green-50` |
| Поражение | `text-red-600`, `bg-red-50` |
| Роль: Мирный | `bg-blue-100 text-blue-800` |
| Роль: Шериф | `bg-yellow-100 text-yellow-800` |
| Роль: Мафия | `bg-gray-200 text-gray-800` |
| Роль: Дон | `bg-purple-100 text-purple-800` |
| Акцент / кнопки | `bg-indigo-600 hover:bg-indigo-700` |
| Фон | `bg-gray-50` |
| Карточки | `bg-white rounded-xl shadow-sm` |

### 8.2. Названия ролей (русский)

```javascript
const ROLE_NAMES = {
  citizen: "Мирный",
  sheriff: "Шериф",
  mafia: "Мафия",
  don: "Дон",
};

const TEAM_NAMES = {
  red: "Красные",
  black: "Чёрные",
};

const RESULT_NAMES = {
  win: "Победа",
  lose: "Поражение",
};
```

### 8.3. Иконки (lucide-react)

```
Дашборд — LayoutDashboard
Игры — Swords или Gamepad2
Рейтинг — Trophy
Игроки — Users
Настройки — Settings
Добавить — Plus или PlusCircle
Удалить — Trash2
Редактировать — Pencil
Назад — ArrowLeft
Победа красных — Shield
Победа чёрных — Skull
```

### 8.4. Адаптивность

- Desktop: полная таблица с данными
- Mobile: табы снизу, таблицы горизонтально скроллятся, карточки вместо строк где уместно

---

## 9. Генерация UUID

Без внешних библиотек:

```javascript
function generateId() {
  return crypto.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}
```

---

## 10. Структура состояния приложения

```javascript
// Глобальное состояние (useState в корневом App)
const [seasons, setSeasons] = useState([]);
const [players, setPlayers] = useState([]);
const [games, setGames] = useState([]);         // игры ТЕКУЩЕГО сезона
const [allGames, setAllGames] = useState([]);   // игры ВСЕХ сезонов (для дашборда, рейтинга, списка)
const [currentSeasonId, setCurrentSeasonId] = useState(null);
const [currentPage, setCurrentPage] = useState("dashboard");
  // Возможные страницы: "dashboard", "games", "gameDetail", "gameForm",
  //   "rating", "players", "playerProfile", "compare", "settings"
const [selectedId, setSelectedId] = useState(null); // id игры или игрока для детального просмотра
const [loading, setLoading] = useState(true);
```

### 10.1. Навигационные хелперы

```javascript
function navigate(page, id = null) {
  setCurrentPage(page);
  setSelectedId(id);
}
```

---

## 11. Пошаговый план реализации

Реализуй в следующем порядке. Каждый шаг должен давать работающий результат.

### Шаг 1: Скелет приложения

- Корневой компонент `App` со state для страниц, сезонов, игроков, игр
- Layout: шапка с названием + SeasonSelector, горизонтальные табы навигации
- Заглушки для всех страниц
- Функции загрузки/сохранения данных из `window.storage`
- При первом запуске (нет данных) — автоматически создать первый сезон "Сезон 1"

### Шаг 2: Управление игроками (PlayerList)

- Таблица игроков с ником, именем, статусом
- Модальное окно добавления (nickname обязательно, realName опционально)
- Редактирование по клику
- Деактивация с подтверждением

### Шаг 3: Форма добавления игры (GameForm)

- Шаг 1/3: 10 полей выбора игрока (dropdown) + номер места
- Шаг 2/3: назначение ролей каждому + счётчик ролей + выбор победителя
- Шаг 3/3: таблица с авторасчётом result/baseScore + ввод bonusScore и комментариев
- Сохранение в storage

### Шаг 4: Список игр (GameList) и детали (GameDetail)

- Таблица игр с фильтрами
- Детальный просмотр с полной информацией
- Удаление и переход к редактированию

### Шаг 5: Рейтинг / Лидерборд

- Таблица со всеми метриками
- Сортировка по столбцам
- Фильтр по сезону

### Шаг 6: Дашборд

- Карточки-метрики сезона
- Топ-5 игроков
- Последние 5 игр
- Кнопка быстрого добавления игры

### Шаг 7: Профиль игрока (PlayerProfile)

- Общая статистика + по ролям
- Статистика пар (одноцвет/разноцвет)
- График динамики баллов (Recharts LineChart)
- История игр

### Шаг 8: Настройки

- Экспорт в JSON (download)
- Импорт из JSON (file input)
- Управление сезонами (создание, завершение, удаление пустых)
- Сброс данных

---

## 12. Обработка ошибок и edge cases

### 12.1. Пустое состояние (empty state)

Каждый экран должен корректно отображаться, когда данных нет:
- Дашборд без игр → "Нет игр в этом сезоне. Добавьте первую игру!"
- Рейтинг без игр → "Пока нет данных для рейтинга"
- Профиль без игр → "Игрок ещё не участвовал в играх"
- Список игроков пуст → "Добавьте первого игрока"

### 12.2. Ошибки storage

```javascript
async function safeGet(key, fallback = []) {
  try {
    const result = await window.storage.get(key, true);  // shared: true
    return result ? JSON.parse(result.value) : fallback;
  } catch {
    return fallback;
  }
}

async function safeSet(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), true);  // shared: true
    return true;
  } catch (error) {
    console.error("Storage error:", error);
    return false;
  }
}
```

### 12.3. Защита от потери данных

- Перед удалением: всегда модальное подтверждение
- Перед сбросом: двойное подтверждение (модал + ввод слова "УДАЛИТЬ")
- Перед импортом: предупреждение о перезаписи

---

## 13. Требования к реализации

### 13.1. Технические требования

- **Один файл .jsx** — весь код в одном React-артефакте
- **Tailwind CSS** — только core utility classes (без компилятора)
- **React hooks** — useState, useEffect, useMemo, useCallback
- **Без localStorage/sessionStorage** — только `window.storage` API
- **Без react-router** — навигация через useState
- **Русский UI** — все надписи, кнопки, placeholder'ы на русском

### 13.2. Структура кода

```
1. Константы (ROLE_NAMES, цвета, иконки, MIN_GAMES_FOR_NOMINATION)
2. Утилиты (generateId, getTeam, safeGet, safeSet)
3. Функции расчёта метрик (calcPlayerStats, calcRoleStats, calcPairStats, calcDashboardStats, calcRoleNominations, calcFormTrend)
4. Маленькие переиспользуемые компоненты (Modal, Badge, StatCard, EmptyState, FormTrendBadge)
5. Компоненты страниц (Dashboard, GameList, GameForm, GameDetail, Leaderboard, PlayerList, PlayerProfile, PlayerCompare, Settings)
6. Главный компонент App (state, навигация, layout, роутинг)
7. export default App
```

### 13.3. Качество кода

- Все данные из storage загружаются через useEffect при монтировании
- Состояние loading отображается до загрузки данных
- Мемоизация тяжёлых вычислений через useMemo
- Обработка всех edge cases из раздела 12
- Консистентный стиль: все карточки, таблицы, кнопки в едином дизайне
