import { useState } from "react";
import { formatDate } from "../lib/utils";

const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
// Минимальное расстояние между подписями месяцев, доля ширины графика.
const MIN_TICK_GAP = 0.12;

const formatElo = (value) => Math.round(value).toLocaleString("ru-RU");

function monthKey(date) {
  return String(date ?? "").slice(0, 7);
}

function monthLabel(date) {
  const [year, month] = String(date).slice(0, 7).split("-");
  return `${MONTHS[Number(month) - 1]} ${year.slice(2)}`;
}

// Динамика ELO игрока. Инлайновый SVG — график простой, тянуть recharts незачем.
// SVG растягивается по ширине (preserveAspectRatio="none"), поэтому подписи,
// маркер и всплывающее значение рисуются HTML-слоем поверх в процентах.
export function EloSparkline({ history, width = 260, height = 56 }) {
  const [hovered, setHovered] = useState(null);

  if (!history || history.length < 2) return null;

  // Точка 0 — рейтинг до первой игры, точка i — после игры history[i - 1].
  const values = [history[0].eloBefore, ...history.map((h) => h.eloAfter)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const padding = 4;
  const stepX = (width - padding * 2) / (values.length - 1);
  const toY = (v) => padding + (1 - (v - min) / span) * (height - padding * 2);

  const points = values.map((v, i) => [padding + i * stepX, toY(v)]);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${padding},${height} ${line} ${(width - padding).toFixed(1)},${height}`;

  const last = points[points.length - 1];
  const growing = values[values.length - 1] >= values[0];
  const color = growing ? "var(--color-emerald-400)" : "var(--color-red-400)";

  const ticks = [];
  history.forEach((h, i) => {
    if (i > 0 && monthKey(h.date) === monthKey(history[i - 1].date)) return;
    const ratio = points[i + 1][0] / width;
    const prev = ticks[ticks.length - 1];
    if (prev && ratio - prev.ratio < MIN_TICK_GAP) return;
    ticks.push({ ratio, label: monthLabel(h.date) });
  });

  const onPointer = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const index = Math.round((x - padding) / stepX);
    setHovered(Math.min(Math.max(index, 0), values.length - 1));
  };

  const active = hovered == null ? null : {
    x: points[hovered][0],
    ratio: points[hovered][0] / width,
    yRatio: points[hovered][1] / height,
    value: values[hovered],
    game: hovered > 0 ? history[hovered - 1] : null,
  };
  const labelShift = active == null ? 0 : active.ratio < 0.2 ? 0 : active.ratio > 0.8 ? -100 : -50;

  return (
    <div>
      <div
        className="relative h-14 touch-pan-y"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        // На тач-устройствах pointerleave приходит сразу после отпускания пальца —
        // там подпись остаётся до следующего касания.
        onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-14"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Динамика ELO: с ${formatElo(values[0])} до ${formatElo(values[values.length - 1])}`}
        >
          <polygon points={area} style={{ fill: color }} opacity="0.12" />
          <polyline points={line} fill="none" style={{ stroke: color }} strokeWidth="1.5"
            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {active == null && <circle cx={last[0]} cy={last[1]} r="2.5" style={{ fill: color }} />}
          {active != null && (
            <line x1={active.x} x2={active.x} y1="0" y2={height}
              className="stroke-slate-400" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {active != null && (
          <>
            <span
              className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-slate-900"
              style={{ left: `${active.ratio * 100}%`, top: `${active.yRatio * 100}%`, backgroundColor: color }}
            />
            <div
              className="pointer-events-none absolute bottom-full mb-1 z-10 whitespace-nowrap rounded-md border border-indigo-500/20
                bg-slate-900/95 px-2 py-1 text-xs text-slate-300 shadow-lg"
              style={{ left: `${active.ratio * 100}%`, transform: `translateX(${labelShift}%)` }}
            >
              <span className="font-semibold text-slate-100">{formatElo(active.value)}</span>
              {active.game ? (
                <>
                  {active.game.delta != null && (
                    <span className={`ml-1.5 ${active.game.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {active.game.delta >= 0 ? "+" : "−"}
                      {Math.abs(active.game.delta).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}
                    </span>
                  )}
                  <span className="ml-1.5 text-slate-500">
                    {formatDate(active.game.date)}
                    {active.game.gameNumber != null && ` · игра №${active.game.gameNumber}`}
                  </span>
                </>
              ) : (
                <span className="ml-1.5 text-slate-500">старт</span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="relative mt-1 h-4 text-[10px] text-slate-500">
        {ticks.map((tick) => (
          <span
            key={tick.label}
            className="absolute whitespace-nowrap"
            style={{
              left: `${tick.ratio * 100}%`,
              transform: `translateX(${tick.ratio > 0.9 ? -100 : tick.ratio < 0.05 ? 0 : -50}%)`,
            }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}
