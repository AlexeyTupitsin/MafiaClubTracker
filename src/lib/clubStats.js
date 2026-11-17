// Статистика клуба — чистые функции над играми в памяти, без БД.
import { compareGamesChronologically } from "./elo";

const dateOf = (game) => String(game.date ?? "").slice(0, 10);
const monthOf = (game) => dateOf(game).slice(0, 7);

const ROLES = ["citizen", "sheriff", "mafia", "don"];

/** Игр, вечеров (разных дат), игроков, игр за вечер в среднем. */
export function clubOverview(games) {
  const evenings = new Set(games.map(dateOf));
  const players = new Set(games.flatMap((g) => g.players.map((p) => p.playerId)));
  return {
    games: games.length,
    evenings: evenings.size,
    players: players.size,
    gamesPerEvening: evenings.size > 0 ? games.length / evenings.size : 0,
  };
}

/**
 * Игры по месяцам от первого до последнего, без пропусков:
 * [{ month: '2026-03', games, evenings }]. Месяц без игр — нули.
 */
export function monthlyActivity(games) {
  if (games.length === 0) return [];
  const byMonth = new Map();
  for (const g of games) {
    const m = monthOf(g);
    const row = byMonth.get(m) ?? { games: 0, dates: new Set() };
    row.games++;
    row.dates.add(dateOf(g));
    byMonth.set(m, row);
  }
  const months = [...byMonth.keys()].sort();
  let [year, month] = months[0].split("-").map(Number);
  const last = months.at(-1);
  const result = [];
  for (;;) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const row = byMonth.get(key);
    result.push({ month: key, games: row?.games ?? 0, evenings: row?.dates.size ?? 0 });
    if (key === last) break;
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return result;
}

/**
 * Победы команд по сезонам, от старых к новым (по первой игре сезона):
 * [{ seasonId, name, games, red, black, draws }]. Сезоны без игр пропускаются.
 */
export function teamBalanceBySeason(games, seasons) {
  const bySeason = new Map();
  for (const g of [...games].sort(compareGamesChronologically)) {
    const row = bySeason.get(g.seasonId) ?? { seasonId: g.seasonId, games: 0, red: 0, black: 0, draws: 0 };
    row.games++;
    if (g.winner === "red") row.red++;
    else if (g.winner === "black") row.black++;
    else if (g.winner === "draw") row.draws++;
    bySeason.set(g.seasonId, row);
  }
  return [...bySeason.values()].map((row) => ({
    ...row,
    name: seasons.find((s) => s.id === row.seasonId)?.name ?? "?",
  }));
}

// Шериф побеждает ровно тогда, когда мирные, дон — когда мафия:
// их процент повторял бы соседнюю строку
const WINRATE_ROLES = ["citizen", "mafia"];

/** Процент побед по ролям — по всем выходам в роли: [{ role, games, wins, winrate }]. */
export function roleWinrates(games) {
  const rows = Object.fromEntries(WINRATE_ROLES.map((r) => [r, { role: r, games: 0, wins: 0 }]));
  for (const g of games) {
    for (const p of g.players) {
      const row = rows[p.role];
      if (!row) continue;
      row.games++;
      if (p.result === "win") row.wins++;
    }
  }
  return WINRATE_ROLES.map((r) => ({ ...rows[r], winrate: rows[r].games > 0 ? (rows[r].wins / rows[r].games) * 100 : 0 }));
}

const countGames = (games) => {
  const counts = new Map();
  for (const g of games) for (const p of g.players) counts.set(p.playerId, (counts.get(p.playerId) ?? 0) + 1);
  return counts;
};
const nicknameOf = (players, id) => players.find((p) => p.id === id)?.nickname ?? "?";

/** Больше всего игр за период: [{ id, nickname, games }]. */
export function mostActive(games, players, limit = 10) {
  return [...countGames(games).entries()]
    .map(([id, n]) => ({ id, nickname: nicknameOf(players, id), games: n }))
    .sort((a, b) => b.games - a.games || a.nickname.localeCompare(b.nickname, "ru"))
    .slice(0, limit);
}

/**
 * Новички: игроки, чья первая игра в клубе (по allGames) попала в период games.
 * Свежие первыми: [{ id, nickname, firstDate, games }] (games — игр за период).
 */
export function newcomers(games, allGames, players, limit = 5) {
  const firstDate = new Map();
  for (const g of allGames) {
    const d = dateOf(g);
    for (const p of g.players) {
      const prev = firstDate.get(p.playerId);
      if (!prev || d < prev) firstDate.set(p.playerId, d);
    }
  }
  const inPeriod = new Set(games.map(dateOf));
  const counts = countGames(games);
  return [...counts.keys()]
    .filter((id) => inPeriod.has(firstDate.get(id)))
    .map((id) => ({ id, nickname: nicknameOf(players, id), firstDate: firstDate.get(id), games: counts.get(id) }))
    .sort((a, b) => b.firstDate.localeCompare(a.firstDate) || b.games - a.games)
    .slice(0, limit);
}
