import { useCallback, useEffect, useState } from "react";

const SAVE_DELAY_MS = 500;

function removeDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage недоступен — черновика и не было
  }
}

function readDraft(key) {
  let saved;
  try {
    saved = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    removeDraft(key);
    return null;
  }
}

/**
 * Черновик новой игры в localStorage.
 * pending — найденный при открытии черновик: форма показывает плашку
 * «Продолжить / Начать заново» (accept / discard). Пока выбор не сделан,
 * черновик не перезаписывается. Пустая форма (isEmpty) черновик не создаёт.
 * values должен быть мемоизирован. enabled = false (редактирование) — без черновика.
 */
export function useGameDraft({ key, enabled, values, restore, isEmpty = false }) {
  const [pending, setPending] = useState(() => (enabled ? readDraft(key) : null));

  useEffect(() => {
    if (!enabled || pending) return;
    const timer = setTimeout(() => {
      if (isEmpty) { removeDraft(key); return; }
      try {
        localStorage.setItem(key, JSON.stringify({ ...values, savedAt: Date.now() }));
      } catch {
        // переполнение или запрет — работаем без черновика
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enabled, key, values, pending, isEmpty]);

  const clear = useCallback(() => removeDraft(key), [key]);
  const accept = useCallback(() => {
    if (pending) restore(pending);
    setPending(null);
  }, [pending, restore]);
  const discard = useCallback(() => {
    removeDraft(key);
    setPending(null);
  }, [key]);

  return { clear, pending, accept, discard };
}
