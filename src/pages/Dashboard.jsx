import { useState, useMemo } from "react";
import { Plus, Shield, Sword, ChevronUp, ChevronDown, Users } from "lucide-react";
import { StatCard, Badge, EmptyState } from "../components/ui";
import { calcDashboardStats, calcRoleNominations, calcPlayerStats, calcKillRate, calcThreshold } from "../lib/metrics";
import { NOMINATION_CONFIG, TEAM_NAMES, ROLE_NAMES, MEDAL_ICON } from "../lib/constants";
import { AdminOnly } from "../components/auth/AuthGuard";
import { useAuth } from "../hooks/useAuth";

export function Dashboard({ games, players, navigate, currentSeason, seasons, currentSeasonId, allGames }) {
  const { isAdmin } = useAuth();
  const hasPlayers = players.length > 0;
  const [showAll, setShowAll] = useState(false);
  const [sortCol, setSortCol] = useState("totalScore");
  const [sortDir, setSortDir] = useState("desc");

  const hasGames = games.length > 0;
  const dashStats = useMemo(() => calcDashboardStats(games), [games]);
  const { nominations, minGames: nominationMinGames } = useMemo(() => calcRoleNominations(games, players), [games, players]);

  // Full rating data
  const ratingData = useMemo(() => {
    const playerIds = new Set();
    games.forEach((g) => g.players.forEach((p) => playerIds.add(p.playerId)));
    return Array.from(playerIds).map((pid) => {
      const player = players.find((p) => p.id === pid);
      const stats = calcPlayerStats(pid, games);
      const kr = calcKillRate(pid, games, seasons);
      return { id: pid, nickname: player?.nickname || "?", ...stats, killRate: kr };
    });
  }, [games, players]);

  const threshold = useMemo(() => calcThreshold(currentSeason, games.length), [currentSeason, games.length]);

  const filteredRating = useMemo(() => {
    let data = showAll ? ratingData : ratingData.filter((r) => r.totalGames >= threshold);
    return [...data].sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [ratingData, showAll, threshold, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return null;
    return sortDir === "asc"
      ? <ChevronUp size={14} className="inline ml-0.5" />
      : <ChevronDown size={14} className="inline ml-0.5" />;
  };

  const medalColors = ["text-yellow-400", "text-slate-400", "text-amber-600"];
  const renderRank = (idx) => (
    <span className="inline-flex justify-center w-full">
      {idx < 3 ? <MEDAL_ICON size={16} className={medalColors[idx]} /> : idx + 1}
    </span>
  );

  // Welcome screen
  if (!hasPlayers) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 rounded-3xl flex items-center justify-center border border-indigo-500/20">
          <Sword size={36} className="text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-indigo-50 mb-2">Добро пожаловать в IronMaf!</h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          Начните работу с приложением — добавьте игроков клуба и проведите первую игру.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={() => navigate("players")}
            className="btn-gradient flex items-center gap-2 px-5 py-2.5 text-sm font-medium cursor-pointer">
            <Users size={18} /> 1. Добавить игроков
          </button>
          <span className="text-slate-600">{"\u2192"}</span>
          <button className="flex items-center gap-2 glass-card px-5 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed opacity-50" disabled>
            <Sword size={18} /> 2. Провести игру
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold gradient-text">Дашборд</h2>

      {!hasGames ? (
        <EmptyState
          icon={Sword}
          title="Нет игр в этом сезоне"
          description="Запишите первую игру, чтобы увидеть статистику"
          action={isAdmin && currentSeason?.isActive ? (
            <button onClick={() => navigate("gameForm")}
              className="btn-gradient px-4 py-2 text-sm cursor-pointer">
              Записать игру
            </button>
          ) : null}
        />
      ) : (
        <>
          {/* Bento grid stat cards */}
          <div className={`grid grid-cols-1 gap-4 stagger-children ${dashStats.draws > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
            <StatCard label="Всего игр" value={dashStats.totalGames} icon={Sword} />
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Побед красных</span>
                <Shield size={18} className="text-red-400/70" />
              </div>
              <div className="text-2xl font-bold font-data text-red-400">
                {dashStats.redWins} <span className="text-base font-normal text-red-500/50">({dashStats.redWinrate.toFixed(0)}%)</span>
              </div>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Побед чёрных</span>
              </div>
              <div className="text-2xl font-bold font-data text-slate-200">
                {dashStats.blackWins} <span className="text-base font-normal text-slate-500">({dashStats.blackWinrate.toFixed(0)}%)</span>
              </div>
            </div>
            {dashStats.draws > 0 && (
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Ничьих</span>
                </div>
                <div className="text-2xl font-bold font-data text-amber-400">
                  {dashStats.draws}
                </div>
              </div>
            )}
          </div>

          {/* Quick action */}
          {currentSeason?.isActive && (
            <AdminOnly>
              <button onClick={() => navigate("gameForm")}
                className="btn-gradient w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer">
                <Plus size={18} /> Добавить игру
              </button>
            </AdminOnly>
          )}

          {/* Rating table */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-indigo-50">Рейтинг</h3>
              <div className="flex items-center gap-2">
                {threshold > 0 && ratingData.length !== filteredRating.length && (
                  <button onClick={() => setShowAll(!showAll)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">
                    {showAll ? `Только \u2265${threshold} игр` : "Показать всех"}
                  </button>
                )}
              </div>
            </div>
            {filteredRating.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">Нет данных для рейтинга</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-indigo-500/10 bg-indigo-500/5">
                      <th className="px-2 py-2.5 text-center font-medium text-slate-400 sticky left-0 z-20 bg-[#0a0908]">#</th>
                      <th className="px-2 py-2.5 text-left font-medium text-slate-400 cursor-pointer select-none sticky left-[36px] z-20 bg-[#0a0908] border-r border-indigo-500/15" onClick={() => handleSort("nickname")}>
                        Ник<SortIcon col="nickname" />
                      </th>
                      <th className="px-2 py-2.5 text-center font-medium text-slate-400 cursor-pointer select-none" onClick={() => handleSort("totalGames")}>
                        Игры<SortIcon col="totalGames" />
                      </th>
                      <th className="px-2 py-2.5 text-center font-medium text-slate-400 cursor-pointer select-none" onClick={() => handleSort("wins")}>
                        Побед<SortIcon col="wins" />
                      </th>
                      <th className="px-2 py-2.5 text-center font-medium text-slate-400 cursor-pointer select-none" onClick={() => handleSort("winrate")} title="Процент побед">
                        WR%<SortIcon col="winrate" />
                      </th>
                      <th className="px-2 py-2.5 text-center font-medium text-slate-400 cursor-pointer select-none" onClick={() => handleSort("totalScore")}>
                        Баллы<SortIcon col="totalScore" />
                      </th>
                      <th className="px-2 py-2.5 text-center font-medium text-slate-400 cursor-pointer select-none" onClick={() => handleSort("avgScore")} title="Средний балл за игру">
                        Ср. балл<SortIcon col="avgScore" />
                      </th>
                      <th className="px-2 py-2.5 text-center font-medium text-slate-400 cursor-pointer select-none" onClick={() => handleSort("avgBonus")} title="Средний дополнительный балл">
                        Ср. доп.<SortIcon col="avgBonus" />
                      </th>
                      <th className="px-2 py-2.5 text-center font-medium text-slate-400" title="Процент первых убийств">ПУ%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRating.map((row, idx) => (
                      <tr key={row.id} className="border-b border-indigo-500/5 last:border-b-0 hover:bg-indigo-500/5 transition-colors">
                        <td className="px-2 py-2.5 text-center font-medium sticky left-0 z-10 bg-[#0a0908]">{renderRank(idx)}</td>
                        <td className="px-2 py-2.5 text-left font-medium max-w-[120px] truncate sticky left-[36px] z-10 bg-[#0a0908] border-r border-indigo-500/15">
                          <button onClick={() => navigate("playerProfile", row.id)}
                            className="text-indigo-400 hover:text-indigo-300 cursor-pointer">{row.nickname}</button>
                        </td>
                        <td className="px-2 py-2.5 text-center font-data">{row.totalGames}</td>
                        <td className="px-2 py-2.5 text-center font-data">{row.wins}</td>
                        <td className="px-2 py-2.5 text-center font-data">
                          <span className={row.winrate > 60 ? "text-emerald-400 font-medium" : row.winrate < 40 ? "text-red-400" : ""}>
                            {row.winrate.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center font-data font-semibold">
                          {row.totalScore % 1 === 0 ? row.totalScore : row.totalScore.toFixed(1)}
                        </td>
                        <td className="px-2 py-2.5 text-center font-data">{row.avgScore.toFixed(2)}</td>
                        <td className="px-2 py-2.5 text-center font-data">
                          <span className={
                            row.avgBonus > 0 ? "text-emerald-400" :
                            row.avgBonus < 0 ? "text-red-400" : ""
                          }>
                            {row.avgBonus.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center text-xs font-data">
                          {row.killRate ? (
                            <span className={
                              row.killRate.killRate > 25 ? "text-red-400" :
                              row.killRate.killRate < 10 ? "text-emerald-400" : ""
                            }>
                              {row.killRate.killRate.toFixed(1)}%
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Nominations */}
          <div>
            <h3 className="font-semibold mb-3 text-indigo-50">Номинации</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
              {NOMINATION_CONFIG.map(({ role, icon: Icon, label }) => {
                const top = nominations[role] || [];
                return (
                  <div key={role} className="glass-card p-4">
                    <div className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-slate-200"><Icon size={14} className="text-indigo-400/70" /> {label}</div>
                    {top.length === 0 ? (
                      <p className="text-xs text-slate-500">Мин. {nominationMinGames} игр за роль</p>
                    ) : (
                      <div className="space-y-1.5">
                        {top.map((p, i) => (
                          <div key={p.playerId} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-medium text-slate-500">{i + 1}.</span>
                              <button onClick={() => navigate("playerProfile", p.playerId)}
                                className="text-indigo-400 hover:text-indigo-300 truncate cursor-pointer">{p.nickname}</button>
                            </div>
                            <span className="text-xs text-slate-400 shrink-0 ml-1 font-data">
                              {p.avgScore.toFixed(2)} <span className="text-slate-500">({p.games})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
