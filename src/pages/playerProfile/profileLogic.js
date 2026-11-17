// Вычисления для профиля игрока — чистые функции, без React.
import { calcPairStats } from "../../lib/metrics";
import { compareGamesDesc } from "../../lib/utils";

/** Игры выбранного периода: "all" — все сезоны, иначе id сезона. */
export function gamesForPeriod(period, allGames) {
  if (period === "all") return allGames;
  return allGames.filter((g) => g.seasonId === period);
}

const playerEntry = (game, playerId) => game.players.find((p) => p.playerId === playerId);

/** Последние турниры, где играл игрок: игры, победы, баллы. */
export function recentTournamentStats(playerId, tournaments, allGames, limit = 3) {
  if (!tournaments || tournaments.length === 0) return [];
  return tournaments
    .map((t) => {
      const played = allGames.filter((g) => g.tournamentId === t.id && playerEntry(g, playerId));
      if (played.length === 0) return null;
      const wins = played.filter((g) => playerEntry(g, playerId).result === "win").length;
      const totalScore = played.reduce((sum, g) => sum + (playerEntry(g, playerId).totalScore || 0), 0);
      return {
        id: t.id,
        name: t.name,
        date: t.date,
        games: played.length,
        wins,
        winrate: (wins / played.length) * 100,
        totalScore,
        avgScore: totalScore / played.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

/** Все, с кем игрок сидел за столом, — со статистикой пары; чаще всего первыми. */
export function partnerStats(playerId, games, players) {
  const partnerIds = new Set();
  for (const g of games) {
    if (!playerEntry(g, playerId)) continue;
    for (const p of g.players) if (p.playerId !== playerId) partnerIds.add(p.playerId);
  }
  return [...partnerIds]
    .map((pid) => ({
      id: pid,
      nickname: players.find((p) => p.id === pid)?.nickname || "?",
      ...calcPairStats(playerId, pid, games),
    }))
    .sort((a, b) => b.totalGames - a.totalGames);
}

export const PARTNER_MIN_GAMES = 5;

/**
 * Лучшие партнёры и неудобные соперники — из partnerStats.
 * partners — с кем в одной команде выигрывает чаще всего;
 * rivals   — против кого выигрывает реже всего.
 * Учитываются только пары с minGames общих игр в такой расстановке,
 * иначе одна случайная игра даёт 100% или 0%. При равном проценте — больше игр.
 */
export function partnerHighlights(pairs, { minGames = PARTNER_MIN_GAMES, limit = 3 } = {}) {
  const pick = (games, wins) => ({ games, wins, winrate: games > 0 ? (wins / games) * 100 : 0 });
  const rows = pairs.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    together: pick(p.bothRed.games + p.bothBlack.games, p.bothRed.wins + p.bothBlack.wins),
    against: pick(p.aRedBBlack.games + p.aBlackBRed.games, p.aRedBBlack.winsA + p.aBlackBRed.winsA),
  }));

  const partners = rows
    .filter((r) => r.together.games >= minGames)
    .sort((a, b) => b.together.winrate - a.together.winrate || b.together.games - a.together.games)
    .slice(0, limit)
    .map((r) => ({ id: r.id, nickname: r.nickname, ...r.together }));

  const rivals = rows
    .filter((r) => r.against.games >= minGames)
    .sort((a, b) => a.against.winrate - b.against.winrate || b.against.games - a.against.games)
    .slice(0, limit)
    .map((r) => ({ id: r.id, nickname: r.nickname, ...r.against }));

  return { partners, rivals, minGames };
}

/** Текущий ELO, изменение за последние recentCount игр и пик. null — истории нет. */
export function eloSummary(history, recentCount = 10) {
  if (history.length === 0) return null;
  const current = history[history.length - 1].eloAfter;
  const recent = history.slice(-recentCount);
  return {
    current: Math.round(current),
    recentCount: recent.length,
    recentDelta: Math.round(current - recent[0].eloBefore),
    peak: Math.round(Math.max(...history.map((h) => h.eloAfter))),
  };
}

/** Игры игрока, новые первыми: { game, ...его запись в игре }. */
export function playerGameHistory(playerId, games) {
  return games
    .filter((g) => playerEntry(g, playerId))
    .sort(compareGamesDesc)
    .map((g) => ({ game: g, ...playerEntry(g, playerId) }));
}

// Форматирование
export const fmtScore = (v) => (v % 1 === 0 ? v : v.toFixed(1));
export const fmtWr = (v) => `${v.toFixed(0)}%`;
export const fmtPairCell = (games, wins, winrate) => (games > 0 ? `${games} / ${wins} (${winrate.toFixed(0)}%)` : "—");
