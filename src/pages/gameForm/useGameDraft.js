import { useCallback, useEffect } from "react";

const SAVE_DELAY_MS = 500;

function removeDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage недоступен — черновика и не было
  }
}

/**
 * Черновик новой игры в localStorage.
 * При открытии формы предлагает восстановить сохранённое, дальше сохраняет
 * values с задержкой. values должен быть мемоизирован.
 * enabled = false (редактирование игры) — черновик не используется.
 */
export function useGameDraft({ key, enabled, values, restore }) {
  // Восстановление — один раз при открытии формы
  useEffect(() => {
    if (!enabled) return;
    let saved;
    try {
      saved = localStorage.getItem(key);
    } catch {
      return;
    }
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      if (window.confirm("Восстановить предыдущую форму?")) restore(draft);
      else removeDraft(key);
    } catch {
      removeDraft(key);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(values));
      } catch {
        // переполнение или запрет — работаем без черновика
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enabled, key, values]);

  const clear = useCallback(() => removeDraft(key), [key]);
  return { clear };
}
