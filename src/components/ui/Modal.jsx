import { X } from "lucide-react";

export function Modal({ title, children, onClose, footer }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1f1f1f] border border-zinc-800 rounded-xl shadow-2xl animate-modal-enter w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
          <h3 className="text-lg font-semibold text-zinc-50">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 text-zinc-400 rounded">
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
