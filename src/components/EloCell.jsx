import { Tooltip } from "./ui";
import { eloExplanationLines, formatElo } from "../lib/elo";

// Значение ELO после игры + изменение. При наведении — расшифровка расчёта.
export function EloCell({ game, gp, align = "right" }) {
  if (gp?.eloAfter == null) {
    return <span className="text-slate-600">—</span>;
  }

  const delta = gp.eloDelta ?? 0;
  const rounded = Math.round(delta);
  const lines = eloExplanationLines(game, gp);

  const value = (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-semibold text-slate-200">{formatElo(gp.eloAfter)}</span>
      <span
        className={
          rounded > 0 ? "text-xs text-emerald-400"
          : rounded < 0 ? "text-xs text-red-400"
          : "text-xs text-slate-500"
        }
      >
        {rounded > 0 ? "+" : ""}{rounded}
      </span>
    </span>
  );

  if (!lines) return value;

  return (
    <Tooltip
      align={align}
      content={
        <span className="block space-y-0.5 font-mono leading-relaxed">
          {lines.map((line) => (
            <span key={line} className="block whitespace-pre-wrap break-words">{line}</span>
          ))}
        </span>
      }
    >
      {value}
    </Tooltip>
  );
}
