import { pluralize } from "../lib/utils";

// Итог серии игр: сколько сыграно и одна полоса «красные — ничьи — чёрные».
// Дашборд (сезон) и страница турнира.
export function TeamBalance({ label = "Сыграно", totalGames, redWins, blackWins, draws = 0, className = "" }) {
  const total = totalGames || 1;
  const red = (redWins / total) * 100;
  const draw = (draws / total) * 100;
  const black = Math.max(0, 100 - red - draw);
  return (
    <section className={`card p-5 md:p-6 flex flex-col ${className}`}>
      <p className="eyebrow">{label}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-5xl font-bold text-stone-50 font-data leading-none">{totalGames}</span>
        <span className="text-stone-400">{pluralize(totalGames, "игра", "игры", "игр")}</span>
      </div>

      <div className="mt-auto pt-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-red-400 font-medium">Красные · <span className="font-data">{redWins}</span></span>
          <span className="text-stone-200 font-medium"><span className="font-data">{blackWins}</span> · Чёрные</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-elev-3 gap-0.5" role="img"
          aria-label={`Побед красных ${red.toFixed(0)}%, чёрных ${black.toFixed(0)}%${draws ? `, ничьих ${draw.toFixed(0)}%` : ""}`}>
          <div className="bg-red-500" style={{ width: `${red}%` }} />
          {draws > 0 && <div className="bg-amber-400" style={{ width: `${draw}%` }} />}
          <div className="bg-stone-500" style={{ width: `${black}%` }} />
        </div>
        <div className="flex justify-between text-xs text-stone-500 mt-2 font-data">
          <span>{red.toFixed(0)}%</span>
          {draws > 0 && <span className="text-amber-400/80">ничьих {draws}</span>}
          <span>{black.toFixed(0)}%</span>
        </div>
      </div>
    </section>
  );
}
