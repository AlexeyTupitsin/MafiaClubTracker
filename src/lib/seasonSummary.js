// Итоги сезона для картинки в чат: цифры, пьедестал, номинации по ролям.
// Считается теми же функциями, что дашборд и «Рейтинг», — цифры совпадают.
import { calcSeasonStats, calcPlayerStats, calcExtendedNominations, calcThreshold } from "./metrics";
import { NOMINATION_CONFIG } from "./constants";

const pad = (n) => String(n).padStart(2, "0");
const fullDate = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

// Подзаголовок только у активного сезона — чтобы в чате не приняли за финал.
// У завершённого дат нет: startDate/endDate в базе — дни открытия и закрытия
// сезона в приложении, а не игр (у «Февраля» это 11.03–11.03).
const seasonPeriod = (season, today) => (season.isActive ? `промежуточные · на ${fullDate(today)}` : null);

// По убыванию; «равны» с допуском — иначе 0.1 + 0.2 ≠ 0.3 сломает правило ничьей
const desc = (a, b) => (Math.abs(b - a) < 1e-9 ? 0 : b - a);

// Средний балл ↓, доп. балл ↓, игры ↓, ник
function comparePodium(a, b) {
  return desc(a.avgScore, b.avgScore)
    || desc(a.avgBonus, b.avgBonus)
    || (b.totalGames - a.totalGames)
    || a.nickname.localeCompare(b.nickname, "ru");
}

export function buildSeasonSummary({ season, games, players, tournaments = [], today = new Date() }) {
  const threshold = calcThreshold(season, games.length);
  const byId = new Map(players.map((p) => [p.id, p]));
  const seasonStats = calcSeasonStats(games);

  const playerIds = new Set(games.flatMap((g) => g.players.map((p) => p.playerId)));
  const tournamentIds = new Set(games.map((g) => g.tournamentId).filter(Boolean));

  const eligible = [...playerIds]
    .map((id) => ({ playerId: id, nickname: byId.get(id)?.nickname ?? "?", ...calcPlayerStats(id, games) }))
    .filter((s) => s.totalGames >= threshold);
  const eligibleIds = new Set(eligible.map((s) => s.playerId));

  const podium = eligible.sort(comparePodium).slice(0, 3).map((s) => ({
    playerId: s.playerId,
    nickname: s.nickname,
    avatarUrl: byId.get(s.playerId)?.avatarUrl ?? null,
    avgScore: s.avgScore,
    avgBonus: s.avgBonus,
    totalGames: s.totalGames,
    winrate: s.winrate,
  }));

  const { nominations: byRole } = calcExtendedNominations(games, players);
  const nominations = NOMINATION_CONFIG.map(({ role, label }) => {
    const top = (byRole[role] || []).find((n) => eligibleIds.has(n.playerId));
    return {
      role,
      label,
      leader: top ? {
        playerId: top.playerId,
        nickname: top.nickname,
        avatarUrl: byId.get(top.playerId)?.avatarUrl ?? null,
        avgBonus: top.avgBonus,
        games: top.games,
      } : null,
    };
  });

  return {
    seasonName: season.name,
    period: seasonPeriod(season, today),
    isInterim: Boolean(season.isActive),
    threshold,
    stats: {
      games: seasonStats.totalGames,
      evenings: tournaments.filter((t) => tournamentIds.has(t.id)).length,
      players: playerIds.size,
      redWins: seasonStats.redWins,
      blackWins: seasonStats.blackWins,
      draws: seasonStats.draws,
      redWinrate: seasonStats.redWinrate,
      blackWinrate: seasonStats.blackWinrate,
    },
    podium,
    nominations,
  };
}
