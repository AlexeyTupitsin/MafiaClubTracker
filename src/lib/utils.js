export function generateId() {
  return crypto.randomUUID?.() ||
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
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
