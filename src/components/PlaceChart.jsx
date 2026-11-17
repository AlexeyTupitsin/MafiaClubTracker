import { useState } from "react";
import { formatDate } from "../lib/utils";

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MIN_TICK_GAP = 0.14; // минимальное расстояние между подписями дат, доля ширины
const MIN_GAP_LABEL = 0.2; // промежуток «ниже порога» уже этого — без подписи

const W = 300;
const H = 120;
const PAD_X = 6;
const PAD_Y = 8;

const monthLabel = (date) => {
  const [year, month] = String(date).split("-");
  return `${MONTHS[Number(month) - 1]} ${year.slice(2)}`;
};

// Место в рейтинге по вечерам сезона. Одна серия: 1-е место сверху.
// Вечер, когда игрок был ниже порога, — разрыв линии.
// Как и EloSparkline: SVG тянется по ширине, подписи и подсказка — HTML поверх.
export function PlaceChart({ history }) {
  const [hovered, setHovered] = useState(null);
  if (!history || history.length < 2) return null;

  const maxPlace = Math.max(2, ...history.map((h) => h.rankedCount));
  const stepX = (W - PAD_X * 2) / (history.length - 1);
  const x = (i) => PAD_X + i * stepX;
  const y = (place) => PAD_Y + ((place - 1) / (maxPlace - 1)) * (H - PAD_Y * 2);

  // Отрезки линии — подряд идущие вечера с местом
  const runs = [];
  history.forEach((h, i) => {
    if (h.place == null) return;
    const point = `${x(i).toFixed(1)},${y(h.place).toFixed(1)}`;
    if (i > 0 && history[i - 1].place != null) runs[runs.length - 1].push(point);
    else runs.push([point]);
  });

  // Промежутки «ниже порога» — без подписи пустая часть графика непонятна
  const gaps = [];
  history.forEach((h, i) => {
    if (h.place != null) return;
    const gap = gaps[gaps.length - 1];
    if (gap && gap.end === i - 1) gap.end = i;
    else gaps.push({ start: i, end: i });
  });
  const gapLabels = gaps
    .filter((g) => (x(g.end) - x(g.start)) / W >= MIN_GAP_LABEL)
    .map((g) => ({ key: g.start, ratio: (x(g.start) + x(g.end)) / 2 / W }));

  const ticks = [];
  history.forEach((h, i) => {
    const month = h.date.slice(0, 7);
    if (i > 0 && month === history[i - 1].date.slice(0, 7)) return;
    const ratio = x(i) / W;
    const prev = ticks[ticks.length - 1];
    if (prev && ratio - prev.ratio < MIN_TICK_GAP) return;
    ticks.push({ ratio, label: monthLabel(h.date) });
  });

  const onPointer = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    setHovered(Math.min(Math.max(Math.round((px - PAD_X) / stepX), 0), history.length - 1));
  };

  const active = hovered == null ? null : history[hovered];
  const activeRatio = hovered == null ? 0 : x(hovered) / W;
  const labelShift = activeRatio < 0.2 ? 0 : activeRatio > 0.8 ? -100 : -50;
  const last = history[history.length - 1];

  return (
    // pt-7 — место под подсказку, чтобы она не закрывала текст над графиком
    <div className="pt-7">
      <div className="flex gap-2">
        {/* Ось места: 1 сверху, последнее место снизу */}
        <div className="relative w-6 shrink-0 text-[11px] text-stone-500 font-data" aria-hidden="true">
          <span className="absolute right-0 -translate-y-1/2" style={{ top: `${(PAD_Y / H) * 100}%` }}>1</span>
          <span className="absolute right-0 -translate-y-1/2" style={{ top: `${((H - PAD_Y) / H) * 100}%` }}>{maxPlace}</span>
        </div>

        <div
          className="relative flex-1 h-[120px] touch-pan-y"
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          // На тач-устройствах pointerleave приходит сразу после касания — подсказка остаётся
          onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(null)}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="w-full h-full"
            role="img"
            aria-label={
              last.place != null
                ? `Место в рейтинге по вечерам: сейчас ${last.place} из ${last.rankedCount}`
                : "Место в рейтинге по вечерам: сейчас ниже порога"
            }
          >
            {/* Сетка: первое и последнее место */}
            {[1, maxPlace].map((p) => (
              <line key={p} x1="0" x2={W} y1={y(p)} y2={y(p)}
                className="stroke-line" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            {runs.map((run, i) => run.length > 1 && (
              <polyline key={i} points={run.join(" ")} fill="none"
                className="stroke-accent-400" strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            ))}
            {hovered != null && (
              <line x1={x(hovered)} x2={x(hovered)} y1="0" y2={H}
                className="stroke-stone-500" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            )}
          </svg>

          {/* Точки вечеров — HTML, чтобы не растягивались вместе с SVG.
              Вечер, когда игрок не играл, — серая точка */}
          {history.map((h, i) => h.place != null && (
            <span
              key={h.date}
              className={`pointer-events-none absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${
                i === hovered
                  ? "w-2.5 h-2.5 bg-accent-300 ring-2 ring-elev-1"
                  : h.played ? "w-1.5 h-1.5 bg-accent-400" : "w-1.5 h-1.5 bg-stone-600"
              }`}
              style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(h.place) / H) * 100}%` }}
              aria-hidden="true"
            />
          ))}

          {gapLabels.map((g) => (
            <span key={g.key} aria-hidden="true"
              className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] text-stone-500"
              style={{ left: `${g.ratio * 100}%` }}>
              ниже порога
            </span>
          ))}

          {active && (
            <div
              className="pointer-events-none absolute bottom-full mb-1 z-10 whitespace-nowrap rounded-md border border-line-strong
                bg-surface-raised px-2 py-1 text-xs text-stone-300 shadow-lg"
              style={{ left: `${activeRatio * 100}%`, transform: `translateX(${labelShift}%)` }}
            >
              {active.place != null
                ? <span className="font-semibold text-stone-100">{active.place} из {active.rankedCount}</span>
                : <span className="font-semibold text-stone-300">ниже порога</span>}
              <span className="ml-1.5 text-stone-500">
                {formatDate(active.date)}{!active.played && " · не играл"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="relative mt-1 ml-8 h-4 text-[10px] text-stone-500" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t.label} className="absolute whitespace-nowrap"
            style={{ left: `${t.ratio * 100}%`, transform: `translateX(${t.ratio > 0.9 ? -100 : t.ratio < 0.05 ? 0 : -50}%)` }}>
            {t.label}
          </span>
        ))}
      </div>

      {/* Таблица для скринридеров — сам график только картинка */}
      <table className="sr-only">
        <caption>Место в рейтинге по вечерам</caption>
        <thead><tr><th>Вечер</th><th>Место</th></tr></thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.date}>
              <td>{formatDate(h.date)}</td>
              <td>{h.place != null ? `${h.place} из ${h.rankedCount}` : "ниже порога"}{!h.played && ", не играл"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
