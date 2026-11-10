import { EloSparkline } from "../../components/EloSparkline";
import { Section } from "./Section";

// Динамика ELO: текущий, пик, изменение за последние игры, график
export function EloSection({ history, summary }) {
  return (
    <Section title="Динамика ELO" defaultOpen={true}>
      <div className="card rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mb-3">
          <span className="text-sm text-stone-400">
            Текущий: <span className="text-lg font-semibold text-stone-200">{summary.current}</span>
          </span>
          <span className="text-sm text-stone-400">
            Пик: <span className="text-stone-200">{summary.peak}</span>
          </span>
          <span className="text-sm text-stone-400">
            За последние {summary.recentCount}:{" "}
            <span className={
              summary.recentDelta > 0 ? "text-emerald-400" :
              summary.recentDelta < 0 ? "text-red-400" : "text-stone-200"
            }>
              {summary.recentDelta > 0 ? "+" : ""}{summary.recentDelta}
            </span>
          </span>
        </div>
        <EloSparkline history={history} />
        <p className="text-xs text-stone-500 mt-2">
          Рейтинг сквозной по всем сезонам — фильтр периода на него не влияет.
        </p>
      </div>
    </Section>
  );
}
