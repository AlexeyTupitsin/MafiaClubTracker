import { PlaceChart } from "../../components/PlaceChart";
import { formatDate } from "../../lib/utils";
import { Section } from "./Section";

// Место в рейтинге сезона по вечерам: сейчас, лучшее и график
export function PlaceSection({ history, season }) {
  const last = history[history.length - 1];
  const best = history.reduce(
    (b, h) => (h.place != null && (!b || h.place < b.place) ? h : b),
    null
  );

  return (
    <Section title="Место в рейтинге" defaultOpen={true}>
      <div className="card rounded-2xl p-4">
        <p className="eyebrow mb-2">{season.name}</p>
        <div className={`flex flex-wrap items-baseline gap-x-6 gap-y-1 ${history.length > 1 ? "mb-1" : "mb-4"}`}>
          <span className="text-sm text-stone-400">
            Сейчас:{" "}
            {last.place != null
              ? <span className="text-lg font-semibold text-stone-100 font-data">{last.place} из {last.rankedCount}</span>
              : <span className="text-stone-200">ниже порога</span>}
          </span>
          {best && (
            <span className="text-sm text-stone-400">
              Лучшее: <span className="text-stone-200 font-data">{best.place}</span>
              <span className="text-stone-500"> · {formatDate(best.date)}</span>
            </span>
          )}
        </div>
        {history.length > 1
          ? <PlaceChart history={history} />
          : <p className="text-sm text-stone-500">График появится после второго вечера.</p>}
        <p className="text-xs text-stone-500 mt-2">
          Точка — итог вечера. Место — по среднему баллу среди прошедших порог, как в таблице рейтинга.
        </p>
      </div>
    </Section>
  );
}
