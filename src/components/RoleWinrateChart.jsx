// Столбчатый график винрейта по ролям (шкала 0–100 %). Раньше здесь был
// recharts — ради двух простых графиков он добавлял ~107 КБ gzip к страницам
// игрока и сравнения. Значения подписаны над столбцами: на телефоне
// всплывающих подсказок нет.

const TICKS = [100, 75, 50, 25, 0];

/**
 * groups — [{ label, bars: [{ value, color, name? }] }], value в процентах.
 * legend — [{ label, color }], если серий несколько.
 */
export function RoleWinrateChart({ groups, legend, height = 192 }) {
  const summary = groups
    .map((g) => `${g.label}: ${g.bars.map((b) => `${b.name ? `${b.name} ` : ""}${b.value}%`).join(", ")}`)
    .join("; ");

  return (
    <div>
      <div className="flex gap-2" style={{ height }} role="img" aria-label={`Winrate по ролям. ${summary}`}>
        {/* Ось Y; pt-4 — место для подписи над столбцом в 100 % */}
        <div className="w-9 shrink-0 pt-4" aria-hidden="true">
          <div className="relative h-full text-[11px] text-zinc-400 font-data">
            {TICKS.map((t) => (
              <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - t}%` }}>{t}%</span>
            ))}
          </div>
        </div>

        <div className="flex-1 pt-4">
          <div className="relative h-full">
            {TICKS.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-dashed border-emerald-500/10"
                style={{ top: `${100 - t}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end justify-around gap-2">
              {groups.map((g) => (
                <div key={g.label} className="flex h-full max-w-24 flex-1 items-end justify-center gap-1">
                  {g.bars.map((b, i) => (
                    <div key={b.name ?? i} className="relative flex h-full max-w-10 flex-1 items-end">
                      <div className="w-full rounded-t transition-[height] duration-500"
                        style={{ height: `${b.value}%`, backgroundColor: b.color }}
                        title={`${b.name ? `${b.name} — ` : ""}${g.label}: ${b.value}%`} />
                      <span className="absolute inset-x-0 text-center text-[11px] text-zinc-300 font-data"
                        style={{ bottom: `calc(${b.value}% + 2px)` }}>
                        {b.value}%
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ось X */}
      <div className="mt-1.5 flex gap-2" aria-hidden="true">
        <div className="w-9 shrink-0" />
        <div className="flex flex-1 justify-around gap-2 text-xs text-zinc-400">
          {groups.map((g) => (
            <span key={g.label} className="max-w-24 flex-1 truncate text-center">{g.label}</span>
          ))}
        </div>
      </div>

      {legend && (
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-zinc-300">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
