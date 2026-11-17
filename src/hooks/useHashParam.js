import { useCallback, useState } from "react";
import { getHashParam, setHashParam } from "../lib/router";

/**
 * Состояние страницы, которое хранится в адресе (#/games?player=<id>):
 * после «назад», F5 или по ссылке фильтры остаются прежними.
 * Значение по умолчанию в адрес не пишется. Запись заменяет текущую запись
 * истории — «назад» не перебирает каждый щелчок по фильтру.
 *
 * parse/format — для чисел и флагов (в адресе всё строка).
 */
export function useHashParam(key, defaultValue, { parse = (v) => v, format = String } = {}) {
  const [value, setValue] = useState(() => {
    const raw = getHashParam(window.location.hash, key);
    return raw == null ? defaultValue : parse(raw);
  });

  const update = useCallback((next) => {
    setValue((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      const raw = resolved === defaultValue || resolved == null ? null : format(resolved);
      const hash = setHashParam(window.location.hash, key, raw);
      if (hash !== window.location.hash) window.history.replaceState(window.history.state, "", hash);
      return resolved;
    });
  }, [key, defaultValue, format]);

  return [value, update];
}

export const intParam = { parse: (v) => parseInt(v, 10) || 0, format: String };
export const boolParam = { parse: (v) => v === "1", format: (v) => (v ? "1" : "0") };
