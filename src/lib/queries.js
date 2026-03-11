import { supabase } from './supabase';

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
  };
}

function toDbSeason(obj) {
  const row = {};
  if (obj.name !== undefined) row.name = obj.name;
  if (obj.startDate !== undefined) row.start_date = obj.startDate;
  if (obj.endDate !== undefined) row.end_date = obj.endDate;
  if (obj.isActive !== undefined) row.is_active = obj.isActive;
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
    gameNumber: row.game_number,
    date: row.date,
    winner: row.winner,
    notes: row.notes,
    createdAt: row.created_at,
    players: (row.game_players || []).map(toFrontendGamePlayer),
  };
}

// ============================================================
// Seasons
// ============================================================

export async function getSeasons() {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data.map(toFrontendSeason);
}

export async function createSeason(season) {
  // Deactivate current active season
  await supabase
    .from('seasons')
    .update({ is_active: false, end_date: new Date().toISOString().split('T')[0] })
    .eq('is_active', true);

  const { data, error } = await supabase
    .from('seasons')
    .insert(toDbSeason(season))
    .select()
    .single();
  if (error) throw error;
  return toFrontendSeason(data);
}

export async function updateSeason(id, updates) {
  const { data, error } = await supabase
    .from('seasons')
    .update(toDbSeason(updates))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toFrontendSeason(data);
}

export async function deleteSeason(id) {
  const { error } = await supabase
    .from('seasons')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// Players
// ============================================================

export async function getPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('nickname');
  if (error) throw error;
  return data.map(toFrontendPlayer);
}

export async function createPlayer(player) {
  const { data, error } = await supabase
    .from('players')
    .insert(toDbPlayer(player))
    .select()
    .single();
  if (error) throw error;
  return toFrontendPlayer(data);
}

export async function updatePlayer(id, updates) {
  const { data, error } = await supabase
    .from('players')
    .update(toDbPlayer(updates))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toFrontendPlayer(data);
}

// ============================================================
// Games
// ============================================================

export async function getGamesBySeason(seasonId) {
  const { data, error } = await supabase
    .from('games')
    .select('*, game_players(*)')
    .eq('season_id', seasonId)
    .order('game_number', { ascending: true });
  if (error) throw error;
  return data.map(toFrontendGame);
}

export async function getAllGames() {
  const { data, error } = await supabase
    .from('games')
    .select('*, game_players(*)')
    .order('date', { ascending: false });
  if (error) throw error;
  return data.map(toFrontendGame);
}

export async function createGame(game) {
  // Insert game row
  const { data: gameRow, error: gameError } = await supabase
    .from('games')
    .insert({
      season_id: game.seasonId,
      game_number: game.gameNumber,
      date: game.date,
      winner: game.winner,
      notes: game.notes || null,
    })
    .select()
    .single();
  if (gameError) throw gameError;

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

  const { error: gpError } = await supabase
    .from('game_players')
    .insert(gpRows);
  if (gpError) throw gpError;

  // Return full game with players
  const { data: full, error: fullError } = await supabase
    .from('games')
    .select('*, game_players(*)')
    .eq('id', gameRow.id)
    .single();
  if (fullError) throw fullError;
  return toFrontendGame(full);
}

export async function updateGame(game) {
  // Update game row
  const { error: gameError } = await supabase
    .from('games')
    .update({
      date: game.date,
      winner: game.winner,
      notes: game.notes || null,
    })
    .eq('id', game.id);
  if (gameError) throw gameError;

  // Delete old game_players and insert new ones
  const { error: delError } = await supabase
    .from('game_players')
    .delete()
    .eq('game_id', game.id);
  if (delError) throw delError;

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

  const { error: gpError } = await supabase
    .from('game_players')
    .insert(gpRows);
  if (gpError) throw gpError;

  // Return full game
  const { data: full, error: fullError } = await supabase
    .from('games')
    .select('*, game_players(*)')
    .eq('id', game.id)
    .single();
  if (fullError) throw fullError;
  return toFrontendGame(full);
}

export async function deleteGame(gameId) {
  // game_players cascade on delete
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId);
  if (error) throw error;
}

// ============================================================
// Bulk operations (for Settings: import/reset/export/demo)
// ============================================================

export async function exportAllData() {
  const seasons = await getSeasons();
  const players = await getPlayers();
  const allGames = await getAllGames();

  // Group games by seasonId for export format compatibility
  const gamesBySeason = {};
  for (const s of seasons) {
    gamesBySeason[s.id] = allGames.filter((g) => g.seasonId === s.id);
  }

  return {
    exportDate: new Date().toISOString(),
    version: 1,
    seasons,
    players,
    games: gamesBySeason,
  };
}

export async function importData(data) {
  // Clear existing data (order matters for foreign keys)
  await supabase.from('game_players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('games').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('seasons').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Insert seasons
  if (data.seasons?.length > 0) {
    const seasonRows = data.seasons.map((s) => ({
      id: s.id,
      name: s.name,
      start_date: s.startDate,
      end_date: s.endDate || null,
      is_active: s.isActive,
    }));
    const { error } = await supabase.from('seasons').insert(seasonRows);
    if (error) throw error;
  }

  // Insert players
  if (data.players?.length > 0) {
    const playerRows = data.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      real_name: p.realName || null,
      is_active: p.isActive !== false,
    }));
    const { error } = await supabase.from('players').insert(playerRows);
    if (error) throw error;
  }

  // Insert games + game_players
  for (const [seasonId, seasonGames] of Object.entries(data.games || {})) {
    for (const game of seasonGames) {
      const { data: gameRow, error: gameError } = await supabase
        .from('games')
        .insert({
          id: game.id,
          season_id: seasonId,
          game_number: game.gameNumber,
          date: game.date,
          winner: game.winner,
          notes: game.notes || null,
        })
        .select()
        .single();
      if (gameError) throw gameError;

      if (game.players?.length > 0) {
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
        const { error: gpError } = await supabase.from('game_players').insert(gpRows);
        if (gpError) throw gpError;
      }
    }
  }
}

export async function resetAllData() {
  // Clear all data
  await supabase.from('game_players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('games').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('seasons').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Create first season
  const { data, error } = await supabase
    .from('seasons')
    .insert({
      name: 'Сезон 1',
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return toFrontendSeason(data);
}

export async function getGameCountBySeason(seasonId) {
  const { count, error } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId);
  if (error) throw error;
  return count;
}
