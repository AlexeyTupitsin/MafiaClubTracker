import { useEffect } from "react";

const FOCUSABLE = "input, select, textarea, button:not([disabled])";

// После неудачной отправки — фокус на первое поле с aria-invalid внутри формы.
// Если отмечена группа (radiogroup), фокус получает её первый элемент управления.
// attempt — счётчик попыток: эффект срабатывает на каждую, а не на каждый ввод.
export function useFocusFirstError(formRef, attempt) {
  useEffect(() => {
    if (!attempt) return;
    const invalid = formRef.current?.querySelector('[aria-invalid="true"]');
    if (!invalid) return;
    const target = invalid.matches(FOCUSABLE) ? invalid : invalid.querySelector(FOCUSABLE);
    target?.focus({ preventScroll: true });
    invalid.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [formRef, attempt]);
}
