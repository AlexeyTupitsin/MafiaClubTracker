// Рейтинг в CSV для Excel и Google Таблиц (Настройки → Данные).
// Формат под русский Excel: «;» между колонками, запятая в дробных, UTF-8 с BOM.
import { calcPlayerStats, calcKillRate, calcThreshold, compareByAvgScore } from "./metrics";

/**
 * Строки рейтинга за период: все, кто играл. Прошедшие порог сезона — сверху
 * с местами, остальные ниже без места. season = null — «Все сезоны», без порога.
 * games — игры периода (уже отфильтрованные по сезону).
 */
export function buildRatingRows({ games, players, seasons, season }) {
  const threshold = season ? calcThreshold(season, games.length) : 0;
  const byId = new Map(players.map((p) => [p.id, p]));
  const playerIds = new Set(games.flatMap((g) => g.players.map((p) => p.playerId)));

  const stats = [...playerIds].map((id) => {
    const entries = games.flatMap((g) => g.players.filter((p) => p.playerId === id));
    return {
      playerId: id,
      nickname: byId.get(id)?.nickname ?? "?",
      ...calcPlayerStats(id, games),
      // ELO сквозной — текущее значение; изменение — только за период
      elo: byId.get(id)?.elo ?? null,
      eloDelta: entries.reduce((sum, p) => sum + (p.eloDelta ?? 0), 0),
      killRate: calcKillRate(id, games, seasons)?.killRate ?? null,
    };
  }).sort(compareByAvgScore);

  const inRating = stats.filter((s) => s.totalGames >= threshold);
  const below = stats.filter((s) => s.totalGames < threshold);
  return [
    ...inRating.map((s, i) => ({ ...s, rank: i + 1, inRating: true })),
    ...below.map((s) => ({ ...s, rank: null, inRating: false })),
  ];
}

const HEADER = ["#", "Ник", "Игры", "Победы", "WR%", "Баллы", "Ср. балл", "Ср. доп.", "ELO", "Изм. ELO", "ПУ%", "В рейтинге"];

// Дробное с запятой; без «-0,00» у околонулевых отрицательных
function num(value, digits) {
  if (value == null) return "";
  const rounded = Number(value.toFixed(digits)) || 0;
  return rounded.toFixed(digits).replace(".", ",");
}

// Кавычки — если есть «;», кавычки или перевод строки; апостроф — чтобы Excel
// не принял ник, начинающийся с = + - @, за формулу
function text(value) {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function ratingToCsv(rows) {
  const lines = rows.map((r) => [
    r.rank ?? "",
    text(r.nickname),
    r.totalGames,
    r.wins,
    num(r.winrate, 0),
    num(r.totalScore, r.totalScore % 1 === 0 ? 0 : 1),
    num(r.avgScore, 2),
    num(r.avgBonus, 2),
    num(r.elo, 0),
    num(r.eloDelta, 0),
    num(r.killRate, 1),
    r.inRating ? "да" : "ниже порога",
  ].join(";"));
  return `\uFEFF${[HEADER.join(";"), ...lines].join("\r\n")}\r\n`;
}
