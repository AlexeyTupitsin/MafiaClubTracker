// Чистая логика формы игры — без React, покрыта тестами.
import { ROLE_REQUIRED } from "../../lib/constants";
import { getTeam } from "../../lib/utils";

export const SEAT_COUNT = 10;
export const BONUS_MIN = -5;
export const BONUS_MAX = 5;

// Полный набор ролей стола — из ROLE_REQUIRED (6 мирных, шериф, 2 мафии, дон)
export const ROLE_SET = Object.entries(ROLE_REQUIRED)
  .flatMap(([role, count]) => Array(count).fill(role));

// Промежуточный ввод доп. балла, пока число не набрано до конца
const PARTIAL_BONUS = new Set(["", "-", ".", "-.", ","]);

export const emptySeats = () =>
  Array.from({ length: SEAT_COUNT }, (_, i) => ({ seat: i + 1, playerId: "" }));

export const today = () => new Date().toISOString().split("T")[0];

// Строка из поля → число; незаконченный или битый ввод считается нулём
export function parseBonus(value) {
  if (PARTIAL_BONUS.has(value)) return 0;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

// Принять ли новое значение поля: незаконченный ввод — да, число — только в диапазоне
export function acceptBonusInput(value) {
  if (PARTIAL_BONUS.has(value)) return true;
  const n = parseFloat(value.replace(",", "."));
  return !Number.isNaN(n) && n >= BONUS_MIN && n <= BONUS_MAX;
}

export function isBonusInvalid(value) {
  if (!value || PARTIAL_BONUS.has(value)) return false;
  const n = parseFloat(value.replace(",", "."));
  return Number.isNaN(n) || n < BONUS_MIN || n > BONUS_MAX;
}

export function toggleBonusSign(value) {
  if (!value || value === "0") return value;
  return value.startsWith("-") ? value.slice(1) : "-" + value;
}

// Результат места и базовый балл: победителям 1, остальным 0
export function seatOutcome(role, winner) {
  const result = winner === "draw" ? "draw" : getTeam(role) === winner ? "win" : "lose";
  return { result, baseScore: result === "win" ? 1 : 0 };
}

// 1 → «1», 1.5 → «1.5», 1.25 → «1.3» — как в итоговой колонке формы
export function formatTotal(total) {
  return total % 1 === 0 ? String(total) : total.toFixed(1);
}

export function buildGamePlayers({ seats, roles, winner, bonusScores, bonusComments }) {
  return seats.map((s, idx) => {
    const role = roles[idx];
    const { result, baseScore } = seatOutcome(role, winner);
    const bonus = parseBonus(bonusScores[idx]);
    return {
      playerId: s.playerId,
      seat: s.seat,
      role,
      result,
      baseScore,
      bonusScore: bonus,
      bonusComment: bonusComments[idx].trim() || null,
      totalScore: baseScore + bonus,
    };
  });
}

export function countRoles(roles) {
  const counts = Object.fromEntries(Object.keys(ROLE_REQUIRED).map((r) => [r, 0]));
  roles.forEach((r) => { if (r) counts[r]++; });
  return counts;
}

export function rolesAreValid(roles) {
  const counts = countRoles(roles);
  return roles.every(Boolean)
    && Object.entries(ROLE_REQUIRED).every(([role, required]) => counts[role] === required);
}

// Дозаполняет пустые места недостающими ролями в случайном порядке.
// Уже выбранные роли не трогает. random — для тестов.
export function fillRandomRoles(roles, random = Math.random) {
  const needed = [...ROLE_SET];
  roles.forEach((r) => {
    const i = needed.indexOf(r);
    if (r && i !== -1) needed.splice(i, 1);
  });
  for (let i = needed.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [needed[i], needed[j]] = [needed[j], needed[i]];
  }
  const result = [...roles];
  let next = 0;
  result.forEach((r, idx) => {
    if (!r && next < needed.length) result[idx] = needed[next++];
  });
  return result;
}

// Номер новой игры в сезоне
export function nextGameNumber(games) {
  return games.reduce((max, g) => Math.max(max, g.gameNumber), 0) + 1;
}
