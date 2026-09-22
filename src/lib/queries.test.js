// REST-слой: пагинация больших выборок и импорт. fetch подменяется,
// сервер PostgREST имитируется по заголовкам Range.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeGame, makePlayers } from '../test/fixtures';

vi.mock('./supabase', () => ({
  SUPABASE_URL: 'https://db.test',
  SUPABASE_ANON_KEY: 'anon',
  getAccessToken: () => 'token',
  hasUserSession: () => false,
  isAccessTokenExpiring: () => false,
  refreshAccessToken: async () => null,
}));

const { getAllGames, getPlayers, createGame, deleteGame, importData } = await import('./queries');

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

const json = (body, status = 200) => new Response(body == null ? null : JSON.stringify(body), { status });

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
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
      if (url.includes('rest/v1/players')) return json([]);
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
      if (url.includes('rest/v1/players')) return json([]);
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
