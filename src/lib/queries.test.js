// REST-слой: запросы, пагинация, запись игр, импорт/экспорт, ELO. fetch
// подменяется, сервер PostgREST имитируется по URL, методу и заголовкам.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeGame, makePlayers } from '../test/fixtures';

// Сессия управляется из тестов: токен, вошёл ли пользователь, чем ответит обновление токена
const auth = vi.hoisted(() => ({ token: 'token', session: false, refresh: null }));

vi.mock('./supabase', () => ({
  SUPABASE_URL: 'https://db.test',
  SUPABASE_ANON_KEY: 'anon',
  getAccessToken: () => auth.token,
  hasUserSession: () => auth.session,
  isAccessTokenExpiring: () => false,
  refreshAccessToken: () => auth.refresh(),
}));

const {
  getAllGames, getPlayers, getSeasons, updatePlayer, createGame, deleteGame,
  importData, exportAllData, recalcElo, getGameCountBySeason,
} = await import('./queries');
const { validateImportData } = await import('./importValidation');
const { replayElo } = await import('./elo');

function gameRow(i) {
  return { id: `g${i}`, season_id: 's1', game_number: i, date: '2026-01-01T19:00:00Z', winner: 'red', game_players: [] };
}

/** Ответ PostgREST на GET с Range: не больше maxRows строк, Content-Range с общим числом. */
function pageResponse(rows, init, maxRows) {
  const [from, to] = init.headers['Range'].split('-').map(Number);
  const page = rows.slice(from, Math.min(to + 1, from + maxRows));
  const range = page.length ? `${from}-${from + page.length - 1}/${rows.length}` : `*/${rows.length}`;
  return new Response(JSON.stringify(page), { status: 206, headers: { 'content-range': range } });
}

// Игрок с устаревшим рейтингом: при пустой истории у него должно быть 1000,
// поэтому пересчёт отправит запись в apply_elo
const STALE_PLAYERS = [{ id: 'p1', nickname: 'A', elo: 1500, elo_games: 3 }];

const json = (body, status = 200) => new Response(body == null ? null : JSON.stringify(body), { status });

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  Object.assign(auth, { token: 'token', session: false, refresh: vi.fn(async () => null) });
});
afterEach(() => vi.unstubAllGlobals());

const calls = (part) => fetchMock.mock.calls.filter(([url]) => url.includes(part));

describe('getAllGames — пагинация', () => {
  it('забирает все игры, если их больше 1000', async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => gameRow(i));
    fetchMock.mockImplementation(async (url, init) => pageResponse(rows, init, 1000));

    const games = await getAllGames();

    expect(games).toHaveLength(2500);
    expect(games[2499].id).toBe('g2499');
    expect(fetchMock.mock.calls.map(([, init]) => init.headers['Range'])).toEqual(['0-999', '1000-1999', '2000-2999']);
    // Однозначный порядок — без него строки на границе страниц могут потеряться
    expect(fetchMock.mock.calls[0][0]).toContain('order=date.desc,id.desc');
  });

  it('сервер отдаёт меньше строк, чем запрошено (max-rows < 1000)', async () => {
    const rows = Array.from({ length: 1000 }, (_, i) => gameRow(i));
    fetchMock.mockImplementation(async (url, init) => pageResponse(rows, init, 400));

    const games = await getAllGames();

    expect(games).toHaveLength(1000);
    expect(fetchMock.mock.calls.map(([, init]) => init.headers['Range'])).toEqual(['0-999', '400-1399', '800-1799']);
  });

  it('пустая таблица — один запрос', async () => {
    fetchMock.mockImplementation(async (url, init) => pageResponse([], init, 1000));
    expect(await getAllGames()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('importData', () => {
  const file = () => ({
    version: 2,
    seasons: [{ id: 's1', name: 'Сезон 1', startDate: '2026-01-01' }],
    players: makePlayers(),
    tournaments: [],
    games: { s1: [makeGame()] },
  });

  // import_data, затем пересчёт ELO: игры, игроки, apply_elo
  function server({ importStatus = 204, importBody = null, eloFails = false } = {}) {
    fetchMock.mockImplementation(async (url, init) => {
      if (url.includes('rpc/import_data')) return json(importBody, importStatus);
      if (url.includes('rest/v1/games')) return pageResponse([], init, 1000);
      if (url.includes('rest/v1/players')) return json(STALE_PLAYERS);
      if (url.includes('rpc/apply_elo')) return eloFails ? json({ message: 'timeout' }, 500) : json(null, 204);
      throw new Error(`unexpected ${url}`);
    });
  }

  it('отправляет файл целиком в import_data и пересчитывает ELO', async () => {
    server();
    const data = file();

    expect(await importData(data)).toEqual({ eloError: null });

    const [[, init]] = calls('rpc/import_data');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ p_data: data });
    expect(calls('rpc/apply_elo')).toHaveLength(1);
  });

  it('битый файл не уходит на сервер', async () => {
    const data = file();
    data.games.s1[0].players[0].playerId = 'p404';

    await expect(importData(data)).rejects.toThrow(/не прошёл проверку.*p404/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('нет функции import_data — ошибка с подсказкой, старый импорт не запускается', async () => {
    server({ importStatus: 404, importBody: { code: 'PGRST202', message: 'Could not find the function' } });

    await expect(importData(file())).rejects.toThrow('005_import_data.sql');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('сбой пересчёта ELO не выдаётся за сбой импорта', async () => {
    server({ eloFails: true });

    const { eloError } = await importData(file());
    expect(eloError.message).toBe('timeout');
  });
});

describe('createGame / deleteGame', () => {
  const newGame = () => ({ newId: 'new-uuid', seasonId: 's1', gameNumber: 7, ...makeGame() });

  function server({ saveStatus = 200, eloFails = false } = {}) {
    fetchMock.mockImplementation(async (url, init) => {
      if (url.includes('rpc/save_game')) return json('new-uuid', saveStatus);
      if (url.includes('rest/v1/games?id=eq.')) return json(null, 204);
      if (url.includes('rest/v1/games')) return pageResponse([], init, 1000);
      if (url.includes('rest/v1/players')) return json(STALE_PLAYERS);
      if (url.includes('rpc/apply_elo')) return eloFails ? json({ message: 'timeout' }, 500) : json(null, 204);
      throw new Error(`unexpected ${url}`);
    });
  }

  it('новая игра уходит с заранее выданным id', async () => {
    server();
    expect(await createGame(newGame())).toEqual({ id: 'new-uuid', eloError: null });

    const body = JSON.parse(calls('rpc/save_game')[0][1].body);
    expect(body.p_game).toMatchObject({ new_id: 'new-uuid', season_id: 's1' });
    expect(body.p_game.id).toBeUndefined();
  });

  it('игра сохранена, пересчёт ELO упал — возвращается eloError, а не исключение', async () => {
    server({ eloFails: true });
    const { id, eloError } = await createGame(newGame());
    expect(id).toBe('new-uuid');
    expect(eloError.message).toBe('timeout');
  });

  it('сбой сохранения — исключение, пересчёт не запускается', async () => {
    server({ saveStatus: 500 });
    await expect(createGame(newGame())).rejects.toThrow();
    expect(calls('rpc/apply_elo')).toHaveLength(0);
  });

  it('удаление: сбой пересчёта ELO не выдаётся за сбой удаления', async () => {
    server({ eloFails: true });
    const { eloError } = await deleteGame('g1');
    expect(eloError.message).toBe('timeout');
  });
});

describe('таймаут запросов', () => {
  it('зависший запрос обрывается с понятной ошибкой', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new DOMException('signal timed out', 'TimeoutError')));
    await expect(getPlayers()).rejects.toThrow('Сервер не ответил за 20 с');
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});

describe('аватары', () => {
  it('старый полный URL показывается через текущий адрес Supabase', async () => {
    fetchMock.mockResolvedValue(json([
      { id: 'p1', nickname: 'A', avatar_url: '/supabase-proxy/storage/v1/object/public/avatars/p1/1.jpg' },
      { id: 'p2', nickname: 'B', avatar_url: 'p2/2.jpg' },
      { id: 'p3', nickname: 'C', avatar_url: null },
    ]));
    const players = await getPlayers();
    expect(players.map((p) => p.avatarUrl)).toEqual([
      'https://db.test/storage/v1/object/public/avatars/p1/1.jpg',
      'https://db.test/storage/v1/object/public/avatars/p2/2.jpg',
      null,
    ]);
  });
});

describe('recalcElo — пишет только изменившееся', () => {
  // Игра в формате БД; stored — сохранённый ELO (Map playerId → entry) или ничего
  function dbGame(game, stored) {
    return {
      id: game.id, season_id: game.seasonId, game_number: game.gameNumber, date: game.date,
      winner: game.winner, created_at: game.createdAt ?? null,
      game_players: game.players.map((gp) => {
        const e = stored?.get(gp.playerId);
        return {
          id: gp.id, player_id: gp.playerId, seat: gp.seat, role: gp.role, result: gp.result,
          base_score: gp.baseScore, bonus_score: gp.bonusScore, total_score: gp.totalScore,
          elo_before: e?.eloBefore ?? null, elo_expected: e?.expected ?? null, elo_k: e?.k ?? null,
          elo_delta: e?.delta ?? null, elo_after: e?.eloAfter ?? null,
        };
      }),
    };
  }

  const dbPlayers = (final) => makePlayers().map((p) => ({
    id: p.id, nickname: p.nickname,
    elo: final?.get(p.id)?.elo ?? 1000, elo_games: final?.get(p.id)?.eloGames ?? 0,
  }));

  const g1 = makeGame({ id: 'g1', gameNumber: 1, date: '2026-01-01T19:00:00Z', winner: 'red' });
  const g2 = makeGame({ id: 'g2', gameNumber: 2, date: '2026-01-02T19:00:00Z', winner: 'black' });

  function server(gameRows, playerRows) {
    fetchMock.mockImplementation(async (url, init) => {
      if (url.includes('rest/v1/games')) return pageResponse(gameRows, init, 1000);
      if (url.includes('rest/v1/players')) return json(playerRows);
      if (url.includes('rpc/apply_elo')) return json(null, 204);
      throw new Error(`unexpected ${url}`);
    });
  }
  const applied = () => JSON.parse(calls('rpc/apply_elo')[0][1].body);

  it('новая игра в конце истории — пишутся только её строки', async () => {
    const after1 = replayElo([g1]);
    server([dbGame(g2), dbGame(g1, after1.perGame.get('g1'))], dbPlayers(after1.final));

    const result = await recalcElo();

    const body = applied();
    expect(body.p_game_players.map((r) => r.id).every((id) => id.startsWith('g2-'))).toBe(true);
    expect(body.p_game_players).toHaveLength(10);
    expect(body.p_players).toHaveLength(10);
    expect(result).toEqual({ gamesProcessed: 2, rowsUpdated: 10, playersUpdated: 10 });
  });

  it('всё актуально — запись не отправляется', async () => {
    const all = replayElo([g1, g2]);
    server([dbGame(g2, all.perGame.get('g2')), dbGame(g1, all.perGame.get('g1'))], dbPlayers(all.final));

    expect(await recalcElo()).toEqual({ gamesProcessed: 2, rowsUpdated: 0, playersUpdated: 0 });
    expect(calls('rpc/apply_elo')).toHaveLength(0);
  });

  it('изменилась старая игра — переписывается она и всё после неё', async () => {
    // Сохранено по старому результату первой игры, теперь в ней победили чёрные
    const before = replayElo([g1, g2]);
    const g1edited = makeGame({ id: 'g1', gameNumber: 1, date: '2026-01-01T19:00:00Z', winner: 'black' });
    server([dbGame(g2, before.perGame.get('g2')), dbGame(g1edited, before.perGame.get('g1'))], dbPlayers(before.final));

    await recalcElo();

    const ids = applied().p_game_players.map((r) => r.id);
    expect(ids.filter((id) => id.startsWith('g1-'))).toHaveLength(10);
    expect(ids.filter((id) => id.startsWith('g2-'))).toHaveLength(10);
  });
});

describe('истёкший токен (401)', () => {
  const players = [{ id: 'p1', nickname: 'A', elo: 1000, elo_games: 0 }];
  const bearer = (i) => fetchMock.mock.calls[i][1].headers['Authorization'];

  it('админ: токен обновляется, запрос повторяется с новым', async () => {
    auth.session = true;
    auth.token = 'old';
    auth.refresh.mockImplementation(async () => { auth.token = 'new'; return 'new'; });
    fetchMock.mockResolvedValueOnce(json({ message: 'JWT expired' }, 401)).mockResolvedValueOnce(json(players));

    expect(await getPlayers()).toHaveLength(1);
    expect(auth.refresh).toHaveBeenCalledTimes(1);
    expect([bearer(0), bearer(1)]).toEqual(['Bearer old', 'Bearer new']);
  });

  it('обновить не удалось — «войдите заново»', async () => {
    auth.session = true;
    fetchMock.mockResolvedValue(json({ message: 'JWT expired' }, 401));
    await expect(getPlayers()).rejects.toThrow('Сессия истекла — войдите заново');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('зритель без сессии — токен не обновляется, ошибка сервера как есть', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Invalid API key' }, 401));
    await expect(getPlayers()).rejects.toMatchObject({ message: 'Invalid API key', status: 401 });
    expect(auth.refresh).not.toHaveBeenCalled();
  });
});

describe('строки БД → объекты приложения', () => {
  it('игра: numeric приходят строками, пустые поля — null', async () => {
    fetchMock.mockImplementation(async (url, init) => pageResponse([{
      id: 'g1', season_id: 's1', tournament_id: null, game_number: 3, date: '2026-01-01T19:00:00Z',
      winner: 'red', notes: null, first_killed: 'p2', best_move_seat_1: 4, created_at: '2026-01-01T20:00:00Z',
      game_players: [{
        id: 'gp1', player_id: 'p1', seat: 1, role: 'sheriff', result: 'win',
        base_score: '1', bonus_score: '0.5', bonus_comment: null, total_score: '1.5',
        elo_before: '1000', elo_expected: '0.5', elo_k: 40, elo_delta: '-2.5', elo_after: '997.5',
      }],
    }], init, 1000));

    const [game] = await getAllGames();
    expect(game).toMatchObject({
      id: 'g1', seasonId: 's1', tournamentId: null, gameNumber: 3, winner: 'red',
      firstKilled: 'p2', bestMoveSeat1: 4, bestMoveSeat2: null, bestMoveSeat3: null,
    });
    expect(game.players[0]).toEqual({
      id: 'gp1', playerId: 'p1', seat: 1, role: 'sheriff', result: 'win',
      baseScore: 1, bonusScore: 0.5, bonusComment: null, totalScore: 1.5,
      eloBefore: 1000, eloExpected: 0.5, eloK: 40, eloDelta: -2.5, eloAfter: 997.5,
    });
  });

  it('сезон и игрок: значения по умолчанию для пустых колонок', async () => {
    fetchMock.mockResolvedValueOnce(json([{ id: 's1', name: 'С', start_date: '2026-01-01', end_date: null, is_active: true }]));
    expect((await getSeasons())[0]).toMatchObject({
      trackFirstKill: false, trackBestMove: false, ratingThresholdType: 'none', ratingThresholdValue: 0,
    });

    fetchMock.mockResolvedValueOnce(json([{ id: 'p1', nickname: 'A', elo: null, elo_games: null, avatar_url: null }]));
    expect((await getPlayers())[0]).toMatchObject({ elo: 1000, eloGames: 0, avatarUrl: null });
  });

  it('аватар пишется в БД путём внутри бакета', async () => {
    fetchMock.mockResolvedValue(json([{ id: 'p1', nickname: 'A', avatar_url: 'p1/1.jpg' }]));
    const player = await updatePlayer('p1', { avatarUrl: 'https://db.test/storage/v1/object/public/avatars/p1/1.jpg' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('players?id=eq.p1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ avatar_url: 'p1/1.jpg' });
    expect(player.avatarUrl).toBe('https://db.test/storage/v1/object/public/avatars/p1/1.jpg');
  });
});

describe('экспорт → импорт', () => {
  it('файл экспорта проходит проверку импорта и уходит в import_data без изменений', async () => {
    const game = makeGame({ id: 'g1', seasonId: 's1', tournamentId: 't1' });
    fetchMock.mockImplementation(async (url, init) => {
      if (url.includes('rpc/import_data')) return json(null, 204);
      if (url.includes('rest/v1/seasons')) return json([{ id: 's1', name: 'Сезон', start_date: '2026-01-01', end_date: null, is_active: true }]);
      if (url.includes('rest/v1/players')) return json(makePlayers().map((p) => ({ id: p.id, nickname: p.nickname, elo: 1000, elo_games: 0 })));
      if (url.includes('rest/v1/tournaments')) return json([{ id: 't1', season_id: 's1', name: 'Кубок', date: '2026-02-01' }]);
      if (url.includes('rest/v1/games')) {
        return pageResponse([{
          id: game.id, season_id: 's1', tournament_id: 't1', game_number: 1, date: game.date, winner: game.winner,
          game_players: game.players.map((gp) => ({
            id: gp.id, player_id: gp.playerId, seat: gp.seat, role: gp.role, result: gp.result,
            base_score: gp.baseScore, bonus_score: gp.bonusScore, total_score: gp.totalScore,
          })),
        }], init, 1000);
      }
      if (url.includes('rpc/apply_elo')) return json(null, 204);
      throw new Error(`unexpected ${url}`);
    });

    const exported = await exportAllData();
    expect(exported).toMatchObject({ version: 2, games: { s1: [{ id: 'g1', tournamentId: 't1' }] } });
    expect(validateImportData(exported)).toEqual([]);

    await importData(exported);
    expect(JSON.parse(calls('rpc/import_data')[0][1].body).p_data).toEqual(JSON.parse(JSON.stringify(exported)));
  });
});

describe('сохранение игры без RPC (миграция 003 не применена)', () => {
  it('запись в две таблицы; новой игре — заранее выданный id', async () => {
    fetchMock.mockImplementation(async (url, init) => {
      if (url.includes('rpc/save_game')) return json({ code: 'PGRST202', message: 'Could not find the function' }, 404);
      if (url.includes('rest/v1/games') && init.method === 'POST') return json([{ id: 'new-uuid' }], 201);
      if (url.includes('rest/v1/game_players') && init.method === 'POST') return json([], 201);
      if (url.includes('rest/v1/games')) return pageResponse([], init, 1000);
      if (url.includes('rest/v1/players')) return json([]);
      throw new Error(`unexpected ${init.method} ${url}`);
    });

    const { id } = await createGame({ ...makeGame({ id: undefined }), newId: 'new-uuid', seasonId: 's1', gameNumber: 5 });
    expect(id).toBe('new-uuid');

    const gameBody = JSON.parse(fetchMock.mock.calls.find(([u, i]) => u.includes('rest/v1/games') && i.method === 'POST')[1].body);
    expect(gameBody).toMatchObject({ id: 'new-uuid', season_id: 's1', game_number: 5 });
    const rows = JSON.parse(calls('rest/v1/game_players')[0][1].body);
    expect(rows).toHaveLength(10);
    expect(rows.every((r) => r.game_id === 'new-uuid')).toBe(true);
  });
});

describe('getGameCountBySeason', () => {
  it('число игр из Content-Range', async () => {
    fetchMock.mockResolvedValueOnce(new Response('[{"id":"g1"}]', { status: 206, headers: { 'content-range': '0-0/7' } }));
    expect(await getGameCountBySeason('s1')).toBe(7);
    fetchMock.mockResolvedValueOnce(new Response('[]', { status: 200, headers: { 'content-range': '*/0' } }));
    expect(await getGameCountBySeason('s1')).toBe(0);
  });
});
