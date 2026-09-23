// Аватары лежат в бакете avatars. В БД хранится путь внутри бакета
// ("<id игрока>/<время>.jpg"), полный URL собирается при чтении из текущего
// адреса Supabase. Иначе смена адреса (включили или выключили прокси)
// ломала бы старые аватары, а их удаление оставляло бы файлы-сироты.
//
// Раньше в БД писался полный URL — такие значения тоже понимаем.

const PUBLIC_PREFIX = '/storage/v1/object/public/avatars/';

/**
 * Путь файла внутри бакета из полного URL (с любым адресом) или из пути.
 * null — пусто или ссылка не на наш бакет.
 */
export function avatarPath(value) {
  if (!value) return null;
  const i = value.indexOf(PUBLIC_PREFIX);
  if (i >= 0) return value.slice(i + PUBLIC_PREFIX.length);
  return /^([a-z]+:|\/)/i.test(value) ? null : value;
}

/** Полный URL для показа. Ссылку не на наш бакет оставляем как есть. */
export function avatarPublicUrl(value, baseUrl) {
  if (!value) return null;
  const path = avatarPath(value);
  return path ? `${baseUrl}${PUBLIC_PREFIX}${path}` : value;
}

/** Значение для колонки avatar_url: путь в бакете, чужую ссылку — как есть. */
export function avatarDbValue(value) {
  if (!value) return null;
  return avatarPath(value) ?? value;
}
