import { useState } from "react";
import { ChevronDown } from "lucide-react";

// Сворачиваемая секция профиля
export function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="pt-2">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="group flex items-center justify-between gap-2 w-full h-11 mb-2 text-left cursor-pointer"
      >
        <h3 className="font-display text-base font-bold text-stone-50 group-hover:text-accent-200 transition-colors">{title}</h3>
        <ChevronDown size={18} className={`text-stone-500 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="animate-page-enter">{children}</div>}
    </section>
  );
}
