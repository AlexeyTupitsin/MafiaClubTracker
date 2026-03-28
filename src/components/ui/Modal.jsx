import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Modal({ title, children, onClose, footer }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
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
    const autoFocusEl = modalRef.current?.querySelector('[autofocus]');
    const firstInput = modalRef.current?.querySelector('input, select, textarea');
    const firstFocusable = modalRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (autoFocusEl || firstInput || firstFocusable)?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div ref={modalRef} className="bg-[#120f0a]/95 backdrop-blur-xl border border-indigo-500/15 rounded-2xl shadow-2xl shadow-indigo-500/5 animate-modal-enter w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-indigo-500/10 shrink-0">
          <h3 id="modal-title" className="text-lg font-semibold text-indigo-50">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-indigo-500/10 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer" aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="p-5 border-t border-indigo-500/10 flex justify-end gap-2 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
