import { Check } from "lucide-react";
import { STEPS } from "./gameFormLogic";


// Индикатор шагов. canOpen(n) — можно ли открыть шаг (пройденный или все до него заполнены)
export function StepProgress({ step, onStepClick, canOpen }) {
  return (
    <nav aria-label="Шаги формы" className="mb-5">
      <ol className="grid grid-cols-3 gap-1.5">
        {STEPS.map(({ n, label }) => {
          const current = step === n;
          const done = step > n;
          const open = !current && canOpen(n);
          return (
            <li key={n}>
              <button
                type="button"
                onClick={() => open && onStepClick(n)}
                disabled={!current && !open}
                aria-current={current ? "step" : undefined}
                className="group w-full text-left pt-2.5 pb-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-100"
              >
                <span className={`block h-1 rounded-full mb-2 transition-colors ${
                  current || done ? "bg-accent-400" : "bg-elev-3"
                }`} />
                <span className={`flex items-center gap-1.5 text-[13px] font-medium ${
                  current ? "text-stone-50" : done ? "text-accent-300 group-hover:text-accent-200" : open ? "text-stone-400 group-hover:text-stone-200" : "text-stone-500"
                }`}>
                  {done ? <Check size={14} aria-hidden="true" /> : <span className="font-data">{n}</span>}
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
