// Проверка файла импорта до отправки на сервер. Импорт заменяет все данные,
// поэтому битый файл лучше отклонить сразу с понятным сообщением, а не
// получить ошибку базы посреди загрузки.

const ROLES = new Set(["citizen", "sheriff", "mafia", "don"]);
const RESULTS = new Set(["win", "lose", "draw"]);
const WINNERS = new Set(["red", "black", "draw"]);

const MAX_ERRORS = 10;

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isFilled = (v) => typeof v === "string" && v.trim() !== "";
const isSeat = (v) => Number.isInteger(v) && v >= 1 && v <= 10;

/**
 * Проверяет файл экспорта (формат exportAllData).
 * @returns массив текстов ошибок; пустой — файл можно импортировать
 */
export function validateImportData(data) {
  const errors = [];
  const add = (msg) => errors.push(msg);

  if (!isObject(data)) return ["Файл не похож на экспорт приложения"];
  if (!Array.isArray(data.seasons)) add("Нет списка сезонов (seasons)");
  if (!Array.isArray(data.players)) add("Нет списка игроков (players)");
  if (!isObject(data.games)) add("Нет игр по сезонам (games)");
  if (data.tournaments != null && !Array.isArray(data.tournaments)) add("Список турниров (tournaments) повреждён");
  if (errors.length) return errors;

  const seasonNames = new Map();
  data.seasons.forEach((s, i) => {
    const label = `Сезон №${i + 1}`;
    if (!isObject(s) || s.id == null) return add(`${label}: нет id`);
    if (seasonNames.has(String(s.id))) add(`${label}: id повторяется`);
    seasonNames.set(String(s.id), s.name);
    if (!isFilled(s.name)) add(`${label}: нет названия`);
    if (!isFilled(s.startDate)) add(`Сезон «${s.name}»: нет даты начала`);
  });

  const playerIds = new Set();
  const nicknames = new Set();
  data.players.forEach((p, i) => {
    const label = `Игрок №${i + 1}`;
    if (!isObject(p) || p.id == null) return add(`${label}: нет id`);
    if (playerIds.has(String(p.id))) add(`${label}: id повторяется`);
    playerIds.add(String(p.id));
    if (!isFilled(p.nickname)) return add(`${label}: нет ника`);
    if (nicknames.has(p.nickname)) add(`Ник «${p.nickname}» встречается дважды`);
    nicknames.add(p.nickname);
  });

  const tournamentIds = new Set();
  (data.tournaments || []).forEach((t, i) => {
    const label = `Турнир №${i + 1}`;
    if (!isObject(t) || t.id == null) return add(`${label}: нет id`);
    tournamentIds.add(String(t.id));
    if (!isFilled(t.name)) add(`${label}: нет названия`);
    if (!isFilled(t.date)) add(`Турнир «${t.name}»: нет даты`);
    if (!seasonNames.has(String(t.seasonId))) add(`Турнир «${t.name}»: сезон не найден в файле`);
  });

  for (const [seasonId, games] of Object.entries(data.games)) {
    if (!seasonNames.has(seasonId)) {
      add(`Игры сезона ${seasonId}: сезон не найден в файле`);
      continue;
    }
    const seasonLabel = `сезон «${seasonNames.get(seasonId)}»`;
    if (!Array.isArray(games)) {
      add(`Игры (${seasonLabel}) повреждены`);
      continue;
    }

    const numbers = new Set();
    games.forEach((g, i) => {
      if (!isObject(g)) return add(`Игра №${i + 1} (${seasonLabel}) повреждена`);
      const label = `Игра №${g.gameNumber ?? "?"} (${seasonLabel})`;

      if (!Number.isInteger(g.gameNumber)) add(`${label}: нет номера`);
      else if (numbers.has(g.gameNumber)) add(`${label}: номер повторяется`);
      numbers.add(g.gameNumber);

      if (!WINNERS.has(g.winner)) add(`${label}: неизвестный победитель «${g.winner}»`);
      if (g.tournamentId != null && !tournamentIds.has(String(g.tournamentId))) add(`${label}: турнир не найден в файле`);
      if (g.firstKilled != null && !playerIds.has(String(g.firstKilled))) add(`${label}: первый убитый не найден среди игроков`);
      for (const seat of [g.bestMoveSeat1, g.bestMoveSeat2, g.bestMoveSeat3]) {
        if (seat != null && !isSeat(seat)) add(`${label}: неверное место в лучшем ходе`);
      }

      if (!Array.isArray(g.players) || g.players.length === 0) return add(`${label}: нет состава`);
      const seats = new Set();
      const inGame = new Set();
      for (const gp of g.players) {
        if (!isObject(gp)) { add(`${label}: повреждена запись игрока`); continue; }
        if (!playerIds.has(String(gp.playerId))) add(`${label}: игрок ${gp.playerId} не найден среди игроков`);
        else if (inGame.has(String(gp.playerId))) add(`${label}: игрок записан дважды`);
        inGame.add(String(gp.playerId));
        if (!isSeat(gp.seat)) add(`${label}: неверное место ${gp.seat}`);
        else if (seats.has(gp.seat)) add(`${label}: место ${gp.seat} занято дважды`);
        seats.add(gp.seat);
        if (!ROLES.has(gp.role)) add(`${label}: неизвестная роль «${gp.role}»`);
        if (!RESULTS.has(gp.result)) add(`${label}: неизвестный результат «${gp.result}»`);
      }
    });
  }

  return errors;
}

/** Ошибки проверки одним текстом: первые MAX_ERRORS и сколько ещё. */
export function formatImportErrors(errors) {
  const shown = errors.slice(0, MAX_ERRORS).join("; ");
  const rest = errors.length - MAX_ERRORS;
  return rest > 0 ? `${shown}; и ещё ${rest}` : shown;
}
