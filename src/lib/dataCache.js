// Кэш данных в localStorage: при повторном открытии показываем сохранённое сразу,
// свежие данные грузятся в фоне. Данные публичные — хранить их в браузере безопасно.
// localStorage может быть недоступен (приватный режим, запрет сайта) — тогда кэша просто нет.

const CACHE_KEY = 'ironmaf-data';
const CACHE_VERSION = 1; // увеличить при смене формата — старый кэш будет проигнорирован

export function readDataCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.version !== CACHE_VERSION) return null;
    if (!Array.isArray(data.seasons) || !Array.isArray(data.players)
      || !Array.isArray(data.allGames) || !Array.isArray(data.allTournaments)) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeDataCache({ seasons, players, allGames, allTournaments }) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      savedAt: new Date().toISOString(),
      seasons,
      players,
      allGames,
      allTournaments,
    }));
  } catch {
    // переполнение или запрет — работаем без кэша
  }
}

// Активный сезон, а если его нет — последний в списке (как при загрузке с сервера)
export function pickDefaultSeasonId(seasons) {
  const active = seasons.find((s) => s.isActive);
  return active?.id || seasons[seasons.length - 1]?.id || null;
}

// Игры и турниры сезона в том же порядке, что отдают запросы по сезону
export function seasonSlice({ allGames, allTournaments }, seasonId) {
  if (!seasonId) return { games: [], tournaments: [] };
  return {
    games: allGames
      .filter((g) => g.seasonId === seasonId)
      .sort((a, b) => a.gameNumber - b.gameNumber),
    tournaments: allTournaments.filter((t) => t.seasonId === seasonId),
  };
}
