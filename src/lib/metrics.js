import { getTeam } from "./utils";
import { MIN_GAMES_FOR_NOMINATION } from "./constants";

export function calcPlayerStats(playerId, games) {
  const playerGames = games.flatMap((g) =>
    g.players.filter((p) => p.playerId === playerId).map((p) => ({ ...p, game: g }))
  );
  const totalGames = playerGames.length;
  const wins = playerGames.filter((p) => p.result === "win").length;
  const totalScore = playerGames.reduce((sum, p) => sum + p.totalScore, 0);
  return {
    totalGames,
    wins,
    losses: totalGames - wins,
    winrate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
    totalScore,
    avgScore: totalGames > 0 ? totalScore / totalGames : 0,
  };
}

export function calcSeasonStats(games) {
  const total = games.length;
  const redWins = games.filter((g) => g.winner === "red").length;
  const blackWins = total - redWins;
  const allScores = games.flatMap((g) => g.players.map((p) => p.totalScore));
  const avgScore =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;
  return {
    totalGames: total,
    redWins,
    blackWins,
    redWinrate: total > 0 ? (redWins / total) * 100 : 0,
    blackWinrate: total > 0 ? (blackWins / total) * 100 : 0,
    avgScore,
  };
}

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
    return {
      role,
      games: total,
      wins,
      winrate: total > 0 ? (wins / total) * 100 : 0,
      avgScore: total > 0 ? score / total : 0,
    };
  });
}

export function calcPairStats(playerIdA, playerIdB, games) {
  const sharedGames = games.filter((g) => {
    const ids = g.players.map((p) => p.playerId);
    return ids.includes(playerIdA) && ids.includes(playerIdB);
  });

  const result = {
    totalGames: sharedGames.length,
    bothRed: { games: 0, wins: 0, winrate: 0 },
    bothBlack: { games: 0, wins: 0, winrate: 0 },
    aRedBBlack: { games: 0, winsA: 0, winrateA: 0 },
    aBlackBRed: { games: 0, winsA: 0, winrateA: 0 },
  };

  for (const g of sharedGames) {
    const a = g.players.find((p) => p.playerId === playerIdA);
    const b = g.players.find((p) => p.playerId === playerIdB);
    const teamA = getTeam(a.role);
    const teamB = getTeam(b.role);

    if (teamA === "red" && teamB === "red") {
      result.bothRed.games++;
      if (g.winner === "red") result.bothRed.wins++;
    } else if (teamA === "black" && teamB === "black") {
      result.bothBlack.games++;
      if (g.winner === "black") result.bothBlack.wins++;
    } else if (teamA === "red" && teamB === "black") {
      result.aRedBBlack.games++;
      if (g.winner === "red") result.aRedBBlack.winsA++;
    } else if (teamA === "black" && teamB === "red") {
      result.aBlackBRed.games++;
      if (g.winner === "black") result.aBlackBRed.winsA++;
    }
  }

  const wr = (w, t) => (t > 0 ? (w / t) * 100 : 0);
  result.bothRed.winrate = wr(result.bothRed.wins, result.bothRed.games);
  result.bothBlack.winrate = wr(result.bothBlack.wins, result.bothBlack.games);
  result.aRedBBlack.winrateA = wr(result.aRedBBlack.winsA, result.aRedBBlack.games);
  result.aBlackBRed.winrateA = wr(result.aBlackBRed.winsA, result.aBlackBRed.games);

  return result;
}

export function calcDashboardStats(games) {
  const total = games.length;
  const redWins = games.filter((g) => g.winner === "red").length;
  const blackWins = total - redWins;
  return {
    totalGames: total,
    redWins,
    blackWins,
    redWinrate: total > 0 ? (redWins / total) * 100 : 0,
    blackWinrate: total > 0 ? (blackWins / total) * 100 : 0,
  };
}

export function calcRoleNominations(games, players) {
  const roles = ["citizen", "sheriff", "mafia", "don"];
  const result = {};
  for (const role of roles) {
    const playerScores = [];
    for (const player of players) {
      const roleGames = games.flatMap((g) =>
        g.players.filter((p) => p.playerId === player.id && p.role === role)
      );
      if (roleGames.length < MIN_GAMES_FOR_NOMINATION) continue;
      const totalScore = roleGames.reduce((sum, p) => sum + p.totalScore, 0);
      playerScores.push({
        playerId: player.id,
        nickname: player.nickname,
        games: roleGames.length,
        avgScore: totalScore / roleGames.length,
      });
    }
    result[role] = playerScores.sort((a, b) => b.avgScore - a.avgScore).slice(0, 3);
  }
  return result;
}

export function calcFormTrend(playerId, games, lastN = 10) {
  const playerGames = games
    .filter((g) => g.players.some((p) => p.playerId === playerId))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (playerGames.length === 0) return null;
  const allStats = calcPlayerStats(playerId, games);
  const recentGames = playerGames.slice(-lastN);
  const recentStats = calcPlayerStats(playerId, recentGames);
  const recentResults = recentGames.map((g) => {
    const gp = g.players.find((p) => p.playerId === playerId);
    return gp.result;
  });
  const diff = recentStats.winrate - allStats.winrate;
  let trend;
  if (diff > 10) trend = "up";
  else if (diff < -10) trend = "down";
  else trend = "stable";
  return {
    recentGames: recentGames.length,
    recentWinrate: recentStats.winrate,
    recentAvgScore: recentStats.avgScore,
    overallWinrate: allStats.winrate,
    overallAvgScore: allStats.avgScore,
    recentResults,
    trend,
    diff,
  };
}
