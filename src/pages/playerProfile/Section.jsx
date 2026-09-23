import { useState } from "react";
import { ChevronRight } from "lucide-react";

// Сворачиваемая секция профиля
export function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-lg font-semibold text-slate-200 mb-3 hover:text-indigo-400 transition-colors w-full text-left"
      >
        <ChevronRight size={18} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        {title}
      </button>
      {open && <div className="animate-page-enter">{children}</div>}
    </div>
  );
}
