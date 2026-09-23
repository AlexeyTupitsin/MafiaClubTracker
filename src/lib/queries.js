import { getAccessToken, hasUserSession, isAccessTokenExpiring, refreshAccessToken } from './supabase';
import { replayElo, ELO_START } from './elo';
import { validateImportData, formatImportErrors } from './importValidation';

// ============================================================
// REST helper: direct fetch to bypass supabase-js hanging issue
// ============================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_PROXY_URL || import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * fetch с токеном текущего пользователя. Истекающий токен обновляется заранее,
 * а на 401 — обновляется и запрос повторяется один раз.
 */
async function authFetch(url, { headers = {}, ...init } = {}) {
  if (isAccessTokenExpiring()) await refreshAccessToken();

  const send = () => fetch(url, {
    ...init,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${getAccessToken()}`,
      ...headers,
    },
  });

  let res = await send();
  if (res.status === 401 && hasUserSession()) {
    const token = await refreshAccessToken();
    if (!token) throw new Error('Сессия истекла — войдите заново');
    res = await send();
  }
  return res;
}

async function apiError(res) {
  const body = await res.json().catch(() => ({ message: res.statusText }));
  const error = new Error(body.message || body.error || `HTTP ${res.status}`);
  error.status = res.status;
  error.code = body.code;
  return error;
}

async function rest(path, options = {}) {
  const { method = 'GET', body, headers: extra = {}, single = false } = options;

  const headers = {
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' :
              method === 'PATCH' ? 'return=representation' :
              method === 'DELETE' ? 'return=representation' : undefined,
    ...extra,
  };

  // Remove undefined headers
  Object.keys(headers).forEach(k => headers[k] === undefined && delete headers[k]);

  const res = await authFetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) throw await apiError(res);

  if (method === 'DELETE' && !options.returning) return null;

  // return=minimal отдаёт пустое тело — res.json() на нём падает
  const text = await res.text();
  if (!text) return null;

  const data = JSON.parse(text);
  return single ? data[0] : data;
}

const PAGE_SIZE = 1000;

/**
 * GET всех строк постранично. PostgREST отдаёт за запрос не больше max-rows
 * строк (в Supabase по умолчанию 1000), а остальные молча отбрасывает.
 * Порядок в path должен быть однозначным, иначе строки на границе страниц
 * могут повториться или потеряться.
 */
async function restAll(path) {
  const rows = [];
  for (;;) {
    const from = rows.length;
    const res = await authFetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        'Prefer': 'count=exact',
        'Range-Unit': 'items',
        'Range': `${from}-${from + PAGE_SIZE - 1}`,
      },
    });
    if (!res.ok) throw await apiError(res);

    const page = await res.json();
    rows.push(...page);

    // Content-Range: "0-999/2500"; сервер может отдать меньше PAGE_SIZE строк
    // за раз, поэтому ориентируемся на общее число, а не на размер страницы
    const total = Number(res.headers.get('content-range')?.split('/')[1]);
    if (page.length === 0 || !Number.isFinite(total) || rows.length >= total) return rows;
  }
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
    trackBestMove: row.track_best_move ?? false,
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
  if (obj.trackBestMove !== undefined) row.track_best_move = obj.trackBestMove;
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
    avatarUrl: row.avatar_url ?? null,
    elo: row.elo == null ? ELO_START : Number(row.elo),
    eloGames: row.elo_games ?? 0,
  };
}

function toDbPlayer(obj) {
  const row = {};
  if (obj.nickname !== undefined) row.nickname = obj.nickname;
  if (obj.realName !== undefined) row.real_name = obj.realName;
  if (obj.isActive !== undefined) row.is_active = obj.isActive;
  if (obj.avatarUrl !== undefined) row.avatar_url = obj.avatarUrl;
  return row;
}

function toFrontendGamePlayer(row) {
  return {
    id: row.id,
    playerId: row.player_id,
    seat: row.seat,
    role: row.role,
    result: row.result,
    baseScore: Number(row.base_score),
    bonusScore: Number(row.bonus_score),
    bonusComment: row.bonus_comment,
    totalScore: Number(row.total_score),
    eloBefore: row.elo_before == null ? null : Number(row.elo_before),
    eloExpected: row.elo_expected == null ? null : Number(row.elo_expected),
    eloK: row.elo_k ?? null,
    eloDelta: row.elo_delta == null ? null : Number(row.elo_delta),
    eloAfter: row.elo_after == null ? null : Number(row.elo_after),
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
    bestMoveSeat1: row.best_move_seat_1 ?? null,
    bestMoveSeat2: row.best_move_seat_2 ?? null,
    bestMoveSeat3: row.best_move_seat_3 ?? null,
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

export async function uploadPlayerAvatar(playerId, file) {
  const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const ext = extMap[file.type] || 'jpg';
  const path = `${playerId}/${Date.now()}.${ext}`;

  const res = await authFetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!res.ok) throw await apiError(res);

  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

export async function deletePlayerAvatar(avatarUrl) {
  if (!avatarUrl) return;
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/avatars/`;
  const path = avatarUrl.startsWith(prefix) ? avatarUrl.slice(prefix.length) : null;
  if (!path) return;

  await authFetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`, { method: 'DELETE' });
  // Игнорируем ошибки — файл мог уже не существовать
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
// ELO
// ============================================================

// PostgREST-upsert пачками: конфликт разрешается по первичному ключу id.
async function upsertRows(table, rows, chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await rest(table, {
      method: 'POST',
      body: rows.slice(i, i + chunkSize),
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    });
  }
}

/**
 * Пересчитывает ELO по всей истории игр и сохраняет результат в БД.
 *
 * Пересчёт всегда полный: игру можно завести задним числом или отредактировать
 * старую, а это сдвигает всю последующую цепочку рейтингов.
 */
export async function recalcElo() {
  const games = await getAllGames();
  const players = await getPlayers();
  const { perGame, final } = replayElo(games);

  const gamePlayerRows = [];
  for (const game of games) {
    const byPlayer = perGame.get(game.id);
    if (!byPlayer) continue;

    for (const gp of game.players) {
      const elo = byPlayer.get(gp.playerId);
      if (!elo) continue;

      gamePlayerRows.push({
        id: gp.id,
        elo_before: elo.eloBefore,
        elo_expected: elo.expected,
        elo_k: elo.k,
        elo_delta: elo.delta,
        elo_after: elo.eloAfter,
      });
    }
  }

  const playerRows = players.map((p) => {
    const f = final.get(p.id);
    return {
      id: p.id,
      elo: f?.elo ?? ELO_START,
      elo_games: f?.eloGames ?? 0,
    };
  });

  try {
    // Одна транзакция: рейтинг не останется пересчитанным наполовину
    await rest('rpc/apply_elo', {
      method: 'POST',
      body: { p_game_players: gamePlayerRows, p_players: playerRows },
      headers: { 'Prefer': 'return=minimal' },
    });
  } catch (err) {
    if (!isMissingRpc(err)) throw err;
    console.warn('apply_elo не найдена — примените миграцию 003_atomic_writes.sql');
    await applyEloLegacy(games, players, gamePlayerRows, playerRows);
  }

  return { gamesProcessed: games.length, playersUpdated: playerRows.length };
}

// Функции из миграции 003 могут быть ещё не применены к базе
function isMissingRpc(err) {
  return err.code === 'PGRST202';
}

// Запись ELO без транзакции — только пока не применена миграция 003.
// Upsert требует все NOT NULL колонки, поэтому строки собираются целиком.
async function applyEloLegacy(games, players, gamePlayerRows, playerRows) {
  const eloById = new Map(gamePlayerRows.map((r) => [r.id, r]));
  const fullGamePlayerRows = games.flatMap((game) => game.players
    .filter((gp) => eloById.has(gp.id))
    .map((gp) => ({ ...toDbGamePlayer(gp, game.id), id: gp.id, ...eloById.get(gp.id) })));
  await upsertRows('game_players', fullGamePlayerRows);

  const playerById = new Map(players.map((p) => [p.id, p]));
  await upsertRows('players', playerRows.map((r) => {
    const p = playerById.get(r.id);
    return {
      ...r,
      nickname: p.nickname,
      real_name: p.realName || null,
      is_active: p.isActive !== false,
      avatar_url: p.avatarUrl || null,
    };
  }));
}

// ============================================================
// Games
// ============================================================

export async function getGamesBySeason(seasonId) {
  const data = await restAll(`games?select=*,game_players(*)&season_id=eq.${seasonId}&order=game_number`);
  return data.map(toFrontendGame);
}

// Без пагинации после 1000-й игры пропадали бы самые старые — и пересчёт ELO
// прогонял бы неполную историю
export async function getAllGames() {
  const data = await restAll('games?select=*,game_players(*)&order=date.desc,id.desc');
  return data.map(toFrontendGame);
}

function toDbGamePlayer(p, gameId) {
  return {
    game_id: gameId,
    player_id: p.playerId,
    seat: p.seat,
    role: p.role,
    result: p.result,
    base_score: p.baseScore,
    bonus_score: p.bonusScore,
    bonus_comment: p.bonusComment || null,
    total_score: p.totalScore,
  };
}

function toDbGameFields(game) {
  return {
    tournament_id: game.tournamentId || null,
    date: game.date,
    winner: game.winner,
    notes: game.notes || null,
    first_killed: game.firstKilled || null,
    best_move_seat_1: game.bestMoveSeat1 ?? null,
    best_move_seat_2: game.bestMoveSeat2 ?? null,
    best_move_seat_3: game.bestMoveSeat3 ?? null,
  };
}

/**
 * Сохраняет игру с составом одной транзакцией (RPC save_game).
 * Без id — создаёт новую. Возвращает id игры.
 */
async function saveGame(game) {
  const gameRow = game.id
    ? { id: game.id, ...toDbGameFields(game) }
    : { season_id: game.seasonId, game_number: game.gameNumber, ...toDbGameFields(game) };
  const playerRows = game.players.map((p) => toDbGamePlayer(p, game.id ?? null));

  try {
    return await rest('rpc/save_game', {
      method: 'POST',
      body: { p_game: gameRow, p_players: playerRows },
    });
  } catch (err) {
    if (!isMissingRpc(err)) throw err;
    console.warn('save_game не найдена — примените миграцию 003_atomic_writes.sql');
    return saveGameLegacy(game);
  }
}

// Сохранение без транзакции — только пока не применена миграция 003
async function saveGameLegacy(game) {
  let gameId = game.id;
  if (gameId) {
    await rest(`games?id=eq.${gameId}`, { method: 'PATCH', body: toDbGameFields(game) });
    await rest(`game_players?game_id=eq.${gameId}`, { method: 'DELETE' });
  } else {
    const row = await rest('games', {
      method: 'POST',
      body: { season_id: game.seasonId, game_number: game.gameNumber, ...toDbGameFields(game) },
      single: true,
    });
    gameId = row.id;
  }
  await rest('game_players', {
    method: 'POST',
    body: game.players.map((p) => toDbGamePlayer(p, gameId)),
  });
  return gameId;
}

async function getGame(gameId) {
  const full = await rest(`games?select=*,game_players(*)&id=eq.${gameId}`, { single: true });
  return toFrontendGame(full);
}

export async function createGame(game, { recalc = true } = {}) {
  const gameId = await saveGame({ ...game, id: undefined });
  if (recalc) await recalcElo();
  return getGame(gameId);
}

export async function updateGame(game) {
  const gameId = await saveGame(game);
  await recalcElo();
  return getGame(gameId);
}

export async function deleteGame(gameId) {
  await rest(`games?id=eq.${gameId}`, { method: 'DELETE' });
  await recalcElo();
}

// ============================================================
// Bulk operations (for Settings: import/reset/export/demo)
// ============================================================

export async function exportAllData() {
  const [seasons, players, allGames, allTournaments] = await Promise.all([
    getSeasons(), getPlayers(), getAllGames(), getAllTournaments(),
  ]);

  const gamesBySeason = {};
  for (const s of seasons) {
    gamesBySeason[s.id] = allGames.filter((g) => g.seasonId === s.id);
  }

  return {
    exportDate: new Date().toISOString(),
    version: 2,
    seasons,
    players,
    tournaments: allTournaments,
    games: gamesBySeason,
  };
}

/**
 * Заменяет все данные содержимым файла экспорта. Удаление и вставка идут
 * одной транзакцией (RPC import_data): при ошибке база остаётся как была.
 *
 * ELO пересчитывается после импорта отдельным запросом. Если пересчёт не
 * удался, данные уже импортированы — ошибка возвращается в eloError,
 * а не бросается.
 */
export async function importData(data) {
  const errors = validateImportData(data);
  if (errors.length > 0) throw new Error(`Файл не прошёл проверку: ${formatImportErrors(errors)}`);

  try {
    await rest('rpc/import_data', {
      method: 'POST',
      body: { p_data: data },
      headers: { 'Prefer': 'return=minimal' },
    });
  } catch (err) {
    // Старый неатомарный импорт мог оставить базу полупустой — не откатываемся на него
    if (isMissingRpc(err)) throw new Error('Импорт недоступен: примените миграцию 005_import_data.sql в Supabase', { cause: err });
    throw err;
  }

  try {
    await recalcElo();
    return { eloError: null };
  } catch (err) {
    console.error('ELO recalc after import failed:', err);
    return { eloError: err };
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
      rating_threshold_type: 'none',
      rating_threshold_value: 0,
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
