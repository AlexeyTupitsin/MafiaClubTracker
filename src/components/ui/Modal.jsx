import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Модальное окно. На телефоне — лист снизу с кнопками во всю ширину, с мыши — окно по центру.
 * onSubmit — окно становится формой: Enter в поле отправляет, кнопка в footer — type="submit".
 * description — строка под заголовком (что произойдёт).
 */
export function Modal({ title, description, children, onClose, footer, onSubmit, size = "md" }) {
  const modalRef = useRef(null);
  const titleId = useId();
  // onClose у вызывающих — новая функция на каждый рендер; через ref эффект
  // не перезапускается и не уводит фокус в первое поле при каждом вводе
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    const returnFocusTo = document.activeElement;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(FOCUSABLE);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const root = modalRef.current;
    const firstInput = root?.querySelector("input:not([type=hidden]):not([type=file]), select, textarea");
    (firstInput || root?.querySelector(FOCUSABLE))?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = overflow;
      returnFocusTo?.focus?.();
    };
  }, []);

  const Body = onSubmit ? "form" : "div";
  const bodyProps = onSubmit
    ? { onSubmit: (e) => { e.preventDefault(); onSubmit(e); }, noValidate: true }
    : {};

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div ref={modalRef}
        className={`bg-surface-raised border border-line-strong shadow-2xl shadow-black/60 w-full flex flex-col
          rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[88vh] animate-slide-up sm:animate-modal-enter
          ${size === "lg" ? "sm:max-w-lg" : "sm:max-w-md"}`}>
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-line shrink-0">
          <div className="min-w-0">
            <h3 id={titleId} className="text-base font-semibold text-stone-50">{title}</h3>
            {description && <p className="text-sm text-stone-400 mt-1">{description}</p>}
          </div>
          <button type="button" onClick={onClose}
            className="p-2.5 -m-2 hover:bg-elev-3 text-stone-400 hover:text-stone-200 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>
        <Body {...bodyProps} className="flex flex-col min-h-0">
          <div className="p-5 overflow-y-auto">{children}</div>
          {footer && (
            <div className="px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-line shrink-0
              flex flex-col-reverse sm:flex-row sm:justify-end gap-2 [&>*]:w-full sm:[&>*]:w-auto">
              {footer}
            </div>
          )}
        </Body>
      </div>
    </div>
  );
}
