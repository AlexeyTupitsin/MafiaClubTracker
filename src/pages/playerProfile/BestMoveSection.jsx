import { Section } from "./Section";

const BAR_COLOR = { 3: "bg-emerald-500", 2: "bg-lime-500", 1: "bg-yellow-500", 0: "bg-slate-600" };
const LABEL_COLOR = { 3: "text-emerald-400", 2: "text-lime-400", 1: "text-yellow-400", 0: "text-slate-400" };

// Лучший ход: сколько раз игрок, убитый первым, угадал 3, 2, 1 или 0 чёрных
export function BestMoveSection({ stats }) {
  return (
    <Section title="Лучший ход">
      <div className="glass-card p-4 rounded-xl">
        <p className="text-sm text-slate-400 mb-3">Всего ходов: {stats.total}</p>
        <div className="space-y-2">
          {[3, 2, 1, 0].map((n) => {
            const count = stats.hits[n] ?? 0;
            const pct = stats.total > 0 ? Math.round(count / stats.total * 100) : 0;
            return (
              <div key={n} className="flex items-center gap-3">
                <span className={`text-xs font-mono w-8 shrink-0 ${LABEL_COLOR[n]}`}>{n}/3</span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${BAR_COLOR[n]}`}
                    style={{ width: stats.total > 0 ? `${pct}%` : "0%" }}
                  />
                </div>
                <span className="text-xs text-slate-300 w-6 text-right shrink-0">{count}</span>
                <span className="text-xs text-slate-500 w-10 text-right shrink-0">({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
