// Синтетические данные для тестов — в формате фронтенда (camelCase, как после toFrontendGame).

// Стандартная рассадка: 6 мирных, шериф, 2 мафии, дон
export const LINEUP_ROLES = [
  'citizen', 'citizen', 'citizen', 'citizen', 'citizen', 'citizen',
  'sheriff', 'mafia', 'mafia', 'don',
];

export const PLAYER_IDS = LINEUP_ROLES.map((_, i) => `p${i + 1}`);

const TEAM = { citizen: 'red', sheriff: 'red', mafia: 'black', don: 'black' };

/**
 * Игра со стандартной рассадкой p1..p10.
 * scores — { playerId: { base, bonus } } для тех, кому нужно задать баллы;
 * остальным победителям база 1, проигравшим 0.
 */
export function makeGame({
  id = 'g1',
  seasonId = 's1',
  gameNumber = 1,
  date = '2026-01-01T19:00:00.000Z',
  createdAt,
  winner = 'red',
  scores = {},
  roles = LINEUP_ROLES,
  playerIds = PLAYER_IDS,
  ...extra
} = {}) {
  const players = playerIds.map((playerId, i) => {
    const role = roles[i];
    const result = winner === 'draw' ? 'draw' : TEAM[role] === winner ? 'win' : 'lose';
    const base = scores[playerId]?.base ?? (result === 'win' ? 1 : 0);
    const bonus = scores[playerId]?.bonus ?? 0;
    return {
      id: `${id}-${playerId}`,
      playerId,
      seat: i + 1,
      role,
      result,
      baseScore: base,
      bonusScore: bonus,
      totalScore: base + bonus,
    };
  });
  return { id, seasonId, gameNumber, date, createdAt, winner, players, ...extra };
}

export function makePlayers(ids = PLAYER_IDS) {
  return ids.map((id) => ({ id, nickname: `Игрок ${id}` }));
}
