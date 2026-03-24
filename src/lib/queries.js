import { getAccessToken } from './supabase';

// ============================================================
// REST helper: direct fetch to bypass supabase-js hanging issue
// ============================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function rest(path, options = {}) {
  const { method = 'GET', body, headers: extra = {}, single = false } = options;

  const token = getAccessToken();

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' :
              method === 'PATCH' ? 'return=representation' :
              method === 'DELETE' ? 'return=representation' : undefined,
    ...extra,
  };

  // Remove undefined headers
  Object.keys(headers).forEach(k => headers[k] === undefined && delete headers[k]);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }

  if (method === 'DELETE' && !options.returning) return null;

  const data = await res.json();
  return single ? data[0] : data;
}

// ============================================================
// Helpers: snake_case <-> camelCase transformation
// ============================================================

function toFrontendSeason(row) {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
    trackFirstKill: row.track_first_kill ?? false,
    ratingThresholdType: row.rating_threshold_type ?? 'none',
    ratingThresholdValue: row.rating_threshold_value ?? 0,
  };
}

function toDbSeason(obj) {
  const row = {};
  if (obj.name !== undefined) row.name = obj.name;
  if (obj.startDate !== undefined) row.start_date = obj.startDate;
  if (obj.endDate !== undefined) row.end_date = obj.endDate;
  if (obj.isActive !== undefined) row.is_active = obj.isActive;
  if (obj.trackFirstKill !== undefined) row.track_first_kill = obj.trackFirstKill;
  if (obj.ratingThresholdType !== undefined) row.rating_threshold_type = obj.ratingThresholdType;
  if (obj.ratingThresholdValue !== undefined) row.rating_threshold_value = obj.ratingThresholdValue;
  return row;
}

function toFrontendPlayer(row) {
  return {
    id: row.id,
    nickname: row.nickname,
    realName: row.real_name,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function toDbPlayer(obj) {
  const row = {};
  if (obj.nickname !== undefined) row.nickname = obj.nickname;
  if (obj.realName !== undefined) row.real_name = obj.realName;
  if (obj.isActive !== undefined) row.is_active = obj.isActive;
  return row;
}

function toFrontendGamePlayer(row) {
  return {
    playerId: row.player_id,
    seat: row.seat,
    role: row.role,
    result: row.result,
    baseScore: Number(row.base_score),
    bonusScore: Number(row.bonus_score),
    bonusComment: row.bonus_comment,
    totalScore: Number(row.total_score),
  };
}

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

// ============================================================
// Seasons
// ============================================================

export async function getSeasons() {
  const data = await rest('seasons?select=*&order=start_date.desc');
  return data.map(toFrontendSeason);
}

export async function createSeason(season) {
  // Deactivate current active season
  await rest('seasons?is_active=eq.true', {
    method: 'PATCH',
    body: { is_active: false, end_date: new Date().toISOString().split('T')[0] },
  });

  const row = await rest('seasons', {
    method: 'POST',
    body: toDbSeason(season),
    single: true,
  });
  return toFrontendSeason(row);
}

export async function updateSeason(id, updates) {
  const row = await rest(`seasons?id=eq.${id}`, {
    method: 'PATCH',
    body: toDbSeason(updates),
    single: true,
  });
  return toFrontendSeason(row);
}

export async function deleteSeason(id) {
  await rest(`seasons?id=eq.${id}`, { method: 'DELETE' });
}

// ============================================================
// Players
// ============================================================

export async function getPlayers() {
  const data = await rest('players?select=*&order=nickname');
  return data.map(toFrontendPlayer);
}

export async function createPlayer(player) {
  const row = await rest('players', {
    method: 'POST',
    body: toDbPlayer(player),
    single: true,
  });
  return toFrontendPlayer(row);
}

export async function updatePlayer(id, updates) {
  const row = await rest(`players?id=eq.${id}`, {
    method: 'PATCH',
    body: toDbPlayer(updates),
    single: true,
  });
  return toFrontendPlayer(row);
}

// ============================================================
// Tournaments
// ============================================================

export async function getTournamentsBySeason(seasonId) {
  const data = await rest(`tournaments?select=*&season_id=eq.${seasonId}&order=date.desc`);
  return data.map(toFrontendTournament);
}

export async function getAllTournaments() {
  const data = await rest('tournaments?select=*&order=date.desc');
  return data.map(toFrontendTournament);
}

export async function createTournament({ seasonId, name, date, notes }) {
  const row = await rest('tournaments', {
    method: 'POST',
    body: { season_id: seasonId, name, date, notes: notes || null },
    single: true,
  });
  return toFrontendTournament(row);
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

export async function deleteTournament(id) {
  await rest(`tournaments?id=eq.${id}`, { method: 'DELETE' });
}

// ============================================================
// Games
// ============================================================

export async function getGamesBySeason(seasonId) {
  const data = await rest(`games?select=*,game_players(*)&season_id=eq.${seasonId}&order=game_number`);
  return data.map(toFrontendGame);
}

export async function getAllGames() {
  const data = await rest('games?select=*,game_players(*)&order=date.desc');
  return data.map(toFrontendGame);
}

export async function createGame(game) {
  // Insert game row
  const gameRow = await rest('games', {
    method: 'POST',
    body: {
      season_id: game.seasonId,
      tournament_id: game.tournamentId || null,
      game_number: game.gameNumber,
      date: game.date,
      winner: game.winner,
      notes: game.notes || null,
      first_killed: game.firstKilled || null,
    },
    single: true,
  });

  // Insert game_players
  const gpRows = game.players.map((p) => ({
    game_id: gameRow.id,
    player_id: p.playerId,
    seat: p.seat,
    role: p.role,
    result: p.result,
    base_score: p.baseScore,
    bonus_score: p.bonusScore,
    bonus_comment: p.bonusComment || null,
    total_score: p.totalScore,
  }));

  await rest('game_players', { method: 'POST', body: gpRows });

  // Return full game with players
  const full = await rest(`games?select=*,game_players(*)&id=eq.${gameRow.id}`, { single: true });
  return toFrontendGame(full);
}

export async function updateGame(game) {
  // Update game row
  await rest(`games?id=eq.${game.id}`, {
    method: 'PATCH',
    body: {
      tournament_id: game.tournamentId || null,
      date: game.date,
      winner: game.winner,
      notes: game.notes || null,
      first_killed: game.firstKilled || null,
    },
  });

  // Delete old game_players
  await rest(`game_players?game_id=eq.${game.id}`, { method: 'DELETE' });

  // Insert new game_players
  const gpRows = game.players.map((p) => ({
    game_id: game.id,
    player_id: p.playerId,
    seat: p.seat,
    role: p.role,
    result: p.result,
    base_score: p.baseScore,
    bonus_score: p.bonusScore,
    bonus_comment: p.bonusComment || null,
    total_score: p.totalScore,
  }));

  await rest('game_players', { method: 'POST', body: gpRows });

  // Return full game
  const full = await rest(`games?select=*,game_players(*)&id=eq.${game.id}`, { single: true });
  return toFrontendGame(full);
}

export async function deleteGame(gameId) {
  await rest(`games?id=eq.${gameId}`, { method: 'DELETE' });
}

// ============================================================
// Bulk operations (for Settings: import/reset/export/demo)
// ============================================================

export async function exportAllData() {
  const seasons = await getSeasons();
  const players = await getPlayers();
  const allGames = await getAllGames();

  // Load tournaments for all seasons
  const allTournaments = [];
  for (const s of seasons) {
    const t = await getTournamentsBySeason(s.id);
    allTournaments.push(...t);
  }

  const gamesBySeason = {};
  for (const s of seasons) {
    gamesBySeason[s.id] = allGames.filter((g) => g.seasonId === s.id);
  }

  return {
    exportDate: new Date().toISOString(),
    version: 1,
    seasons,
    players,
    tournaments: allTournaments,
    games: gamesBySeason,
  };
}

export async function importData(data) {
  // Clear existing data (order matters for foreign keys)
  await rest('game_players?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
  await rest('games?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
  await rest('tournaments?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
  await rest('players?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
  await rest('seasons?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });

  // ID maps: old ID → new UUID (DB generates UUIDs)
  const seasonIdMap = {};
  const playerIdMap = {};
  const tournamentIdMap = {};

  // Insert seasons (let DB generate UUIDs)
  for (const s of (data.seasons || [])) {
    const row = await rest('seasons', {
      method: 'POST',
      body: {
        name: s.name,
        start_date: s.startDate,
        end_date: s.endDate || null,
        is_active: s.isActive,
      },
      single: true,
    });
    seasonIdMap[s.id] = row.id;
  }

  // Insert players (let DB generate UUIDs)
  for (const p of (data.players || [])) {
    const row = await rest('players', {
      method: 'POST',
      body: {
        nickname: p.nickname,
        real_name: p.realName || null,
        is_active: p.isActive !== false,
      },
      single: true,
    });
    playerIdMap[p.id] = row.id;
  }

  // Insert tournaments (map old IDs to new UUIDs)
  for (const t of (data.tournaments || [])) {
    const newSeasonId = seasonIdMap[t.seasonId];
    if (!newSeasonId) continue;
    const row = await rest('tournaments', {
      method: 'POST',
      body: {
        season_id: newSeasonId,
        name: t.name,
        date: t.date,
      },
      single: true,
    });
    tournamentIdMap[t.id] = row.id;
  }

  // Insert games + game_players (map old IDs to new UUIDs)
  for (const [oldSeasonId, seasonGames] of Object.entries(data.games || {})) {
    const newSeasonId = seasonIdMap[oldSeasonId];
    if (!newSeasonId) continue;

    for (const game of seasonGames) {
      const gameRow = await rest('games', {
        method: 'POST',
        body: {
          season_id: newSeasonId,
          tournament_id: game.tournamentId ? (tournamentIdMap[game.tournamentId] || null) : null,
          game_number: game.gameNumber,
          date: game.date,
          winner: game.winner,
          notes: game.notes || null,
        },
        single: true,
      });

      if (game.players?.length > 0) {
        const gpRows = game.players.map((p) => ({
          game_id: gameRow.id,
          player_id: playerIdMap[p.playerId] || p.playerId,
          seat: p.seat,
          role: p.role,
          result: p.result,
          base_score: p.baseScore,
          bonus_score: p.bonusScore,
          bonus_comment: p.bonusComment || null,
          total_score: p.totalScore,
        }));
        await rest('game_players', { method: 'POST', body: gpRows });
      }
    }
  }
}

export async function resetAllData() {
  await rest('game_players?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
  await rest('games?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
  await rest('tournaments?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
  await rest('players?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });
  await rest('seasons?id=neq.00000000-0000-0000-0000-000000000000', { method: 'DELETE' });

  const row = await rest('seasons', {
    method: 'POST',
    body: {
      name: 'Сезон 1',
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      is_active: true,
    },
    single: true,
  });
  return toFrontendSeason(row);
}

export async function getGameCountBySeason(seasonId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/games?season_id=eq.${seasonId}&select=id`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact',
      'Range-Unit': 'items',
      'Range': '0-0',
    },
  });
  const range = res.headers.get('content-range');
  // format: "0-0/5" or "*/0"
  if (range) {
    const total = range.split('/')[1];
    return parseInt(total, 10) || 0;
  }
  const data = await res.json();
  return data.length;
}
