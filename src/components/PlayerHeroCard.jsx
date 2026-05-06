import { PlayerAvatar } from "./ui";

export function PlayerHeroCard({ title, player, navigate }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{title}</p>
      {player ? (
        <div className="flex items-center gap-3">
          <PlayerAvatar player={player} size="base" clickable={false} />
          <div className="min-w-0 flex-1">
            <button
              onClick={() => navigate("playerProfile", player.id)}
              className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer truncate block w-full text-left"
            >
              {player.nickname}
            </button>
            <div className="grid grid-cols-2 gap-x-3 mt-1.5 text-xs text-slate-400">
              <span>Игр: <span className="text-slate-200 font-data">{player.totalGames}</span></span>
              <span>Побед: <span className="text-slate-200 font-data">{player.wins}</span></span>
              <span>WR: <span className={`font-data ${player.winrate > 60 ? "text-emerald-400" : player.winrate < 40 ? "text-red-400" : "text-slate-200"}`}>{player.winrate.toFixed(0)}%</span></span>
              <span>Ср.: <span className="text-slate-200 font-data">{player.avgScore.toFixed(2)}</span></span>
              <span className="col-span-2">Доп.: <span className={`font-data ${player.avgBonus > 0 ? "text-emerald-400" : player.avgBonus < 0 ? "text-red-400" : "text-slate-200"}`}>{player.avgBonus > 0 ? "+" : ""}{player.avgBonus.toFixed(2)}</span></span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Нет данных</p>
      )}
    </div>
  );
}
