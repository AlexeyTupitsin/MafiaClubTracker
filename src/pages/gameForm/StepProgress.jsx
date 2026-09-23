import { Fragment } from "react";
import { Check } from "lucide-react";

const STEPS = [
  { n: 1, label: "Игроки" },
  { n: 2, label: "Роли" },
  { n: 3, label: "Баллы" },
];

export const STEP_COUNT = 3;

// Индикатор шагов; вернуться можно только на пройденный шаг
export function StepProgress({ step, onStepClick }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map(({ n, label }, i) => (
        <Fragment key={n}>
          <button
            onClick={() => { if (n < step) onStepClick(n); }}
            disabled={n > step}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              step === n
                ? "btn-gradient cursor-pointer"
                : step > n
                ? "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 cursor-pointer"
                : "bg-slate-800/30 text-slate-500"
            }`}
          >
            {step > n ? <Check size={14} /> : <span>{n}</span>}
            <span className="hidden sm:inline ml-1">{label}</span>
          </button>
          {i < STEP_COUNT - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${step > n ? "bg-indigo-600" : "bg-slate-700"}`} />
          )}
        </Fragment>
      ))}
    </div>
  );
}
