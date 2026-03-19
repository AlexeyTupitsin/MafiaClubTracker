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
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable?.length) focusable[0].focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div ref={modalRef} className="bg-[#1f1f1f] border border-zinc-800 rounded-xl shadow-2xl animate-modal-enter w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
          <h3 id="modal-title" className="text-lg font-semibold text-zinc-50">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 text-zinc-400 rounded transition-colors" aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="p-4 border-t border-zinc-800 flex justify-end gap-2 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
