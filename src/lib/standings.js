// Места в рейтинге сезона — чистые функции над играми в памяти, без БД.
//
// Правило то же, что у таблицы на дашборде и в «Рейтинге» по умолчанию:
// в рейтинг попадают игроки, набравшие порог игр сезона (calcThreshold),
// и сортируются по среднему баллу. При равном среднем выше тот, у кого
// больше игр (таблицы при равенстве порядок не определяют).
import { calcThreshold } from "./metrics";
import { compareGamesChronologically } from "./elo";

const dateOf = (game) => String(game.date ?? "").slice(0, 10);

function addGame(totals, game) {
  for (const p of game.players) {
    const t = totals.get(p.playerId) ?? { id: p.playerId, games: 0, wins: 0, score: 0 };
    t.games++;
    if (p.result === "win") t.wins++;
    t.score += p.totalScore;
    totals.set(p.playerId, t);
  }
}

function rank(totals, threshold) {
  return [...totals.values()]
    .filter((t) => t.games >= threshold)
    .map((t) => ({ ...t, avgScore: t.score / t.games }))
    .sort((a, b) => b.avgScore - a.avgScore || b.games - a.games);
}

/**
 * Рейтинг сезона: ranked — прошедшие порог, по месту;
 * totals — Map всех игроков сезона (и ниже порога); threshold — порог.
 */
export function seasonStandings(games, season) {
  const totals = new Map();
  for (const g of games) addGame(totals, g);
  const threshold = calcThreshold(season, games.length);
  return { ranked: rank(totals, threshold), totals, threshold };
}

/** Место игрока (с 1) или null — не прошёл порог или не играл. */
export function placeOf(ranked, playerId) {
  const i = ranked.findIndex((r) => r.id === playerId);
  return i === -1 ? null : i + 1;
}

/**
 * Место игрока после каждого вечера сезона (вечер — игры одной даты):
 * [{ date, place | null, rankedCount, played }]. Порог считается по играм,
 * сыгранным к этому вечеру, — как рейтинг выглядел в тот момент.
 * Вечера до первой игры игрока не включаются.
 */
export function placeHistory(playerId, games, season) {
  const sorted = [...games].sort(compareGamesChronologically);
  const totals = new Map();
  const history = [];
  let played = false;
  for (let i = 0; i < sorted.length; i++) {
    const g = sorted[i];
    addGame(totals, g);
    if (g.players.some((p) => p.playerId === playerId)) played = true;
    const date = dateOf(g);
    if (i + 1 < sorted.length && dateOf(sorted[i + 1]) === date) continue; // вечер не закончен

    if (totals.has(playerId)) {
      const ranked = rank(totals, calcThreshold(season, i + 1));
      history.push({ date, place: placeOf(ranked, playerId), rankedCount: ranked.length, played });
    }
    played = false;
  }
  return history;
}

/**
 * Сводка игрока для дашборда — по последнему вечеру сезона.
 * null — в сезоне нет игр.
 *
 * place / prevPlace — место сейчас и до последнего вечера (null — вне рейтинга);
 * evening — его игры в последний вечер (null — не играл);
 * above / below — соседи по рейтингу и разница среднего балла с ними;
 * me — его итоги сезона (null — не играл в сезоне);
 * gamesToThreshold — сколько игр не хватает до порога (0 — в рейтинге).
 */
export function eveningSummary(playerId, games, season) {
  if (games.length === 0) return null;
  const date = games.map(dateOf).sort().at(-1);
  const now = seasonStandings(games, season);
  const before = seasonStandings(games.filter((g) => dateOf(g) < date), season);

  const place = placeOf(now.ranked, playerId);
  const prevPlace = placeOf(before.ranked, playerId);

  const entries = games
    .filter((g) => dateOf(g) === date)
    .map((g) => g.players.find((p) => p.playerId === playerId))
    .filter(Boolean);
  const eloDeltas = entries.map((e) => e.eloDelta).filter((d) => d != null);
  const evening = entries.length === 0 ? null : {
    games: entries.length,
    wins: entries.filter((e) => e.result === "win").length,
    score: entries.reduce((sum, e) => sum + e.totalScore, 0),
    eloDelta: eloDeltas.length > 0 ? eloDeltas.reduce((a, b) => a + b, 0) : null,
  };

  const totals = now.totals.get(playerId);
  const me = totals ? { ...totals, avgScore: totals.score / totals.games } : null;
  const neighbour = (r) => (r && me ? { id: r.id, avgScore: r.avgScore, gap: r.avgScore - me.avgScore } : null);

  return {
    date,
    place,
    prevPlace,
    firstEvening: before.totals.size === 0, // вечер открыл сезон — сравнивать не с чем
    rankedCount: now.ranked.length,
    threshold: now.threshold,
    gamesToThreshold: me && place == null ? Math.max(0, now.threshold - me.games) : 0,
    evening,
    me,
    above: place ? neighbour(now.ranked[place - 2]) : null,
    below: place ? neighbour(now.ranked[place]) : null,
  };
}
