import { ELO_CONFIG } from "./constants";
import { getTeam } from "./utils";

// ELO-рейтинг игроков.
//
//   E_A  = 1 / (1 + 10 * ((R_B - R_A) / 400))
//   R_A' = R_A + k * (S_A - E_A)
//
// Внимание: E_A взята в том виде, в каком посчитан числовой пример на картинке
// (умножение, а не возведение 10 в степень). Знаменатель = 1 + (R_B - R_A) / 40,
// поэтому он обращается в ноль при R_B - R_A = -40 и уходит в минус ниже.
// Чтобы рейтинг не улетал, E_A принудительно зажимается в [0; 1]:
//   R_B - R_A  >  0    -> E_A в (0; 1), формула ведёт себя штатно
//   R_B - R_A  в (-40; 0] -> E_A = 1  (свои сильнее: победа не добавляет рейтинга)
//   R_B - R_A  <= -40  -> E_A = 0  (свои сильно сильнее: поражение не отнимает)
//
// R_A — средний рейтинг своей команды (включая самого игрока),
// R_B — средний рейтинг команды соперника, оба на момент игры.
// S_A — фактически набранные в игре баллы (totalScore = база + доп.).
//
// Рейтинг сквозной по всем сезонам, пересчитывается прогоном всей истории
// в хронологическом порядке (см. replayElo).

export const ELO_START = ELO_CONFIG.start;

export function expectedScore(rA, rB) {
  const denominator = 1 + 10 * ((rB - rA) / 400);
  if (denominator <= 0) return denominator === 0 ? 1 : 0;
  return Math.min(1, 1 / denominator);
}

export function kFactor(gamesPlayed) {
  return gamesPlayed <= ELO_CONFIG.newPlayerGames ? ELO_CONFIG.kNew : ELO_CONFIG.kNormal;
}

export function describeK(k) {
  return k === ELO_CONFIG.kNew
    ? `не более ${ELO_CONFIG.newPlayerGames} игр`
    : `более ${ELO_CONFIG.newPlayerGames} игр`;
}

// Хронология: дата → номер игры → время создания.
export function compareGamesChronologically(a, b) {
  const dateDiff = new Date(a.date) - new Date(b.date);
  if (dateDiff !== 0) return dateDiff;
  const numDiff = (a.gameNumber ?? 0) - (b.gameNumber ?? 0);
  if (numDiff !== 0) return numDiff;
  return new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0);
}

/**
 * Считает изменение ELO всех участников одной игры.
 *
 * @param game        игра с массивом players (playerId, role, totalScore)
 * @param ratings     Map<playerId, number> — рейтинги ДО этой игры
 * @param gamesPlayed Map<playerId, number> — сыграно игр ДО этой игры
 * @returns массив записей по каждому игроку (порядок совпадает с game.players)
 */
export function calcGameElo(game, ratings, gamesPlayed) {
  const entries = game.players.map((gp) => ({
    gp,
    team: getTeam(gp.role),
    eloBefore: ratings.get(gp.playerId) ?? ELO_START,
  }));

  const avg = (team) => {
    const teamEntries = entries.filter((e) => e.team === team);
    if (teamEntries.length === 0) return null;
    return teamEntries.reduce((sum, e) => sum + e.eloBefore, 0) / teamEntries.length;
  };

  const teamAvg = { red: avg("red"), black: avg("black") };

  return entries.map(({ gp, team, eloBefore }) => {
    const rA = teamAvg[team];
    const rB = teamAvg[team === "red" ? "black" : "red"];

    // Вырожденный состав (нет одной из команд) — рейтинг не меняем.
    if (rA == null || rB == null) {
      return {
        playerId: gp.playerId,
        eloBefore,
        rA: rA ?? eloBefore,
        rB: rB ?? eloBefore,
        expected: null,
        k: null,
        sA: gp.totalScore,
        delta: 0,
        eloAfter: eloBefore,
      };
    }

    const expected = expectedScore(rA, rB);
    const k = kFactor(gamesPlayed.get(gp.playerId) ?? 0);
    const sA = gp.totalScore;
    const delta = k * (sA - expected);

    return {
      playerId: gp.playerId,
      eloBefore,
      rA,
      rB,
      expected,
      k,
      sA,
      delta,
      eloAfter: Math.round(eloBefore + delta),
    };
  });
}

/**
 * Прогоняет всю историю игр и возвращает ELO по каждой игре и итоговый по игроку.
 *
 * @param allGames игры в любом порядке — сортируются внутри
 * @returns { perGame: Map<gameId, Map<playerId, entry>>, final: Map<playerId, { elo, eloGames }> }
 */
export function replayElo(allGames) {
  const ordered = [...allGames].sort(compareGamesChronologically);

  const ratings = new Map();
  const gamesPlayed = new Map();
  const perGame = new Map();

  for (const game of ordered) {
    const results = calcGameElo(game, ratings, gamesPlayed);
    const byPlayer = new Map();

    for (const entry of results) {
      byPlayer.set(entry.playerId, entry);
      ratings.set(entry.playerId, entry.eloAfter);
      gamesPlayed.set(entry.playerId, (gamesPlayed.get(entry.playerId) ?? 0) + 1);
    }

    perGame.set(game.id, byPlayer);
  }

  const final = new Map();
  for (const [playerId, elo] of ratings) {
    final.set(playerId, { elo, eloGames: gamesPlayed.get(playerId) ?? 0 });
  }

  return { perGame, final };
}

/**
 * История ELO одного игрока в хронологическом порядке — для спарклайна и таблиц.
 * Использует уже сохранённые в БД значения, ничего не пересчитывает.
 */
export function playerEloHistory(playerId, games) {
  return games
    .filter((g) => g.players.some((p) => p.playerId === playerId && p.eloAfter != null))
    .sort(compareGamesChronologically)
    .map((g) => {
      const gp = g.players.find((p) => p.playerId === playerId);
      return {
        gameId: g.id,
        gameNumber: g.gameNumber,
        date: g.date,
        eloBefore: gp.eloBefore,
        eloAfter: gp.eloAfter,
        delta: gp.eloDelta,
      };
    });
}

// ---------------------------------------------------------------
// Отображение
// ---------------------------------------------------------------

// Средние рейтинги команд в игре — восстанавливаются из сохранённых eloBefore,
// поэтому отдельных колонок в БД под R_A / R_B не нужно.
export function eloTeamAverages(game) {
  const avg = (team) => {
    const values = game.players
      .filter((p) => getTeam(p.role) === team && p.eloBefore != null)
      .map((p) => p.eloBefore);
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };
  return { red: avg("red"), black: avg("black") };
}

const num = (value, digits) =>
  value.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/**
 * Построчная расшифровка расчёта для подсказки.
 * Считает только представление — все величины берутся из сохранённых полей.
 */
export function eloExplanationLines(game, gp) {
  if (gp?.eloAfter == null || gp.eloExpected == null) return null;

  const averages = eloTeamAverages(game);
  const team = getTeam(gp.role);
  const rA = averages[team];
  const rB = averages[team === "red" ? "black" : "red"];
  if (rA == null || rB == null) return null;

  const lines = [
    `Своя команда R_A = ${num(rA, 0)}`,
    `Соперники R_B = ${num(rB, 0)}`,
    `E_A = 1 / (1 + 10 × (${num(rB, 0)} − ${num(rA, 0)}) / 400) = ${num(gp.eloExpected, 3)}`,
    `S_A = ${num(gp.sA ?? gp.totalScore, 1)}, k = ${gp.eloK} (${describeK(gp.eloK)})`,
    `ELO = ${gp.eloBefore} + ${gp.eloK} × (${num(gp.totalScore, 1)} − ${num(gp.eloExpected, 3)}) = ${gp.eloAfter}`,
  ];

  // При R_B <= R_A знаменатель формулы обращается в ноль или уходит в минус,
  // поэтому E_A зажата в [0; 1] — предупреждаем, что это не «чистый» расчёт.
  if (rB - rA <= 0) {
    lines.push(`E_A ограничена диапазоном [0; 1]: своя команда сильнее соперников`);
  }

  return lines;
}
