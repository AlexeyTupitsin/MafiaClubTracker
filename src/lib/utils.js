export function generateId() {
  return crypto.randomUUID?.() ||
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

/**
 * Дата «ГГГГ-ММ-ДД» по местному времени, со сдвигом в днях (-1 — вчера).
 * toISOString() даёт дату по UTC: в Москве с 00:00 до 03:00 это ещё вчера.
 */
export function localIsoDate(offsetDays = 0, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function getTeam(role) {
  return role === "citizen" || role === "sheriff" ? "red" : "black";
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Единый порядок игр для отображения: дата (без учёта времени) по убыванию,
 * при равной дате — номер игры по убыванию.
 */
export function compareGamesDesc(a, b) {
  const dateA = String(a.date ?? "").slice(0, 10);
  const dateB = String(b.date ?? "").slice(0, 10);
  if (dateA !== dateB) return dateB.localeCompare(dateA);
  return (b.gameNumber ?? 0) - (a.gameNumber ?? 0);
}

/** Обратный порядок: от старых игр к новым. */
export function compareGamesAsc(a, b) {
  return -compareGamesDesc(a, b);
}

// pluralize(5, "игра", "игры", "игр") → "игр"
export function pluralize(n, one, few, many) {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

// Цвет числа со знаком: плюс — зелёный, минус — красный
export function signedClass(v) {
  return v > 0 ? "text-emerald-400" : v < 0 ? "text-red-400" : "text-stone-400";
}

// Цвет процента побед: выше 60 — зелёный, ниже 40 — красный
export function winrateClass(wr) {
  return wr > 60 ? "text-emerald-400" : wr < 40 ? "text-red-400" : "";
}
