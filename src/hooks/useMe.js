import { useCallback, useSyncExternalStore } from "react";

// «Это я»: зритель один раз отмечает себя в профиле, и дальше его строка
// подсвечена в рейтинге, а игры — в списке. Хранится только в этом браузере
// (у каждого зрителя своё), поэтому localStorage, а не БД.
const KEY = "ironmaf:me";
const EVENT = "ironmaf:me-change";

function read() {
  try {
    return window.localStorage.getItem(KEY) || null;
  } catch {
    return null; // приватный режим, запрет сайтовых данных
  }
}

function subscribe(callback) {
  // storage — изменение в другой вкладке, EVENT — в этой
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

/** [id игрока «я» или null, setMe(id | null)] */
export function useMe() {
  const meId = useSyncExternalStore(subscribe, read, () => null);
  const setMe = useCallback((id) => {
    try {
      if (id) window.localStorage.setItem(KEY, id);
      else window.localStorage.removeItem(KEY);
    } catch {
      // без хранилища отметка не сохранится — не страшно
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [meId, setMe];
}
