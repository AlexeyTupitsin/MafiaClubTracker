import { ROLE_TONE } from "../lib/constants";
import { signedClass } from "../lib/utils";
import { RankMark } from "./RatingTable";

// Топ номинации по роли: значок роли, места, средний доп. балл.
// top: [{ playerId, nickname, games, winrate, avgBonus }]
export function NominationList({ role, icon: Icon, label, top, navigate }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-7 h-7 rounded-full ring-1 ring-inset flex items-center justify-center ${ROLE_TONE[role]}`}>
          <Icon size={14} aria-hidden="true" />
        </span>
        <span className="font-semibold text-stone-100">{label}</span>
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-stone-500 py-2">Нет данных</p>
      ) : (
        <ol className="text-sm font-data">
          {top.map((p, i) => (
            <li key={p.playerId} className="flex items-center gap-3 h-10 border-b border-line last:border-b-0">
              <RankMark idx={i} />
              <button onClick={() => navigate("playerProfile", p.playerId)}
                className="font-sans font-medium text-stone-100 hover:text-accent-300 truncate text-left cursor-pointer">{p.nickname}</button>
              <span className="ml-auto text-xs text-stone-500 whitespace-nowrap">{p.games} игр · {p.winrate.toFixed(0)}%</span>
              <span className={`w-12 text-right font-semibold ${signedClass(p.avgBonus)}`}>
                {p.avgBonus > 0 ? "+" : ""}{p.avgBonus.toFixed(2)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
