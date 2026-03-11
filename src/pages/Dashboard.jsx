import { useState, useMemo } from "react";
import { Plus, Shield, Sword, ChevronUp, ChevronDown, Users } from "lucide-react";
import { StatCard, Badge, EmptyState } from "../components/ui";
import { calcDashboardStats, calcRoleNominations, calcPlayerStats } from "../lib/metrics";
import { NOMINATION_CONFIG, TEAM_NAMES, ROLE_NAMES, MIN_GAMES_FOR_NOMINATION } from "../lib/constants";
import { AdminOnly } from "../components/auth/AuthGuard";

export function Dashboard({ games, players, navigate, currentSeason, seasons, currentSeasonId, allGames }) {
  const hasPlayers = players.length > 0;
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [sortCol, setSortCol] = useState("totalScore");
  const [sortDir, setSortDir] = useState("desc");

  const activeGames = useMemo(() => {
    if (seasonFilter === "all") return allGames || games;
    if (seasonFilter === currentSeasonId) return games;
    return (allGames || games).filter((g) => g.seasonId === seasonFilter);
  }, [seasonFilter, games, currentSeasonId, allGames]);

  const hasGames = activeGames.length > 0;
  const dashStats = useMemo(() => calcDashboardStats(activeGames), [activeGames]);
  const nominations = useMemo(() => calcRoleNominations(activeGames, players), [activeGames, players]);

  // Full rating data
  const ratingData = useMemo(() => {
    const playerIds = new Set();
    activeGames.forEach((g) => g.players.forEach((p) => playerIds.add(p.playerId)));
    return Array.from(playerIds).map((pid) => {
      const player = players.find((p) => p.id === pid);
      const stats = calcPlayerStats(pid, activeGames);
      return { id: pid, nickname: player?.nickname || "?", ...stats };
    });
  }, [activeGames, players]);

  // Threshold: 50% of max games (rounded down)
  const maxGames = useMemo(() => Math.max(...ratingData.map((r) => r.totalGames), 0), [ratingData]);
  const threshold = Math.floor(maxGames / 2);

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

  const medalEmoji = (idx) => idx === 0 ? "\u{1F947}" : idx === 1 ? "\u{1F948}" : idx === 2 ? "\u{1F949}" : idx + 1;

  // Welcome screen
  if (!hasPlayers) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">{"\u{1F3AD}"}</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Добро пожаловать в Mafia Club!</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Начните работу с приложением — добавьте игроков клуба и проведите первую игру.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={() => navigate("players")}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
            <Users size={18} /> 1. Добавить игроков
          </button>
          <span className="text-gray-400">{"\u2192"}</span>
          <button className="flex items-center gap-2 bg-gray-100 text-gray-400 px-5 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed" disabled>
            <Sword size={18} /> 2. Провести игру
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Season filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Дашборд</h2>
        <select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="all">Все сезоны</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {!hasGames ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">{"\u{1F3AD}"}</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Нет игр</h2>
          <p className="text-gray-500 mb-6">Добавьте первую игру!</p>
          {currentSeason?.isActive && (
            <AdminOnly>
              <button onClick={() => navigate("gameForm")}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium mx-auto">
                <Plus size={18} /> Добавить игру
              </button>
            </AdminOnly>
          )}
        </div>
      ) : (
        <>
          {/* Stat cards — 3 cards */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Всего игр" value={dashStats.totalGames} icon={Sword} />
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Побед красных</span>
                <Shield size={18} className="text-red-400" />
              </div>
              <div className="text-2xl font-bold text-red-600">
                {dashStats.redWins} <span className="text-base font-normal text-red-400">({dashStats.redWinrate.toFixed(0)}%)</span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Побед чёрных</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {dashStats.blackWins} <span className="text-base font-normal text-gray-400">({dashStats.blackWinrate.toFixed(0)}%)</span>
              </div>
            </div>
          </div>

          {/* Quick action */}
          {currentSeason?.isActive && (
            <AdminOnly>
              <button onClick={() => navigate("gameForm")}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl text-sm font-medium shadow-sm">
                <Plus size={18} /> Добавить игру
              </button>
            </AdminOnly>
          )}

          {/* Rating table */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Рейтинг</h3>
              <div className="flex items-center gap-2">
                {threshold > 0 && ratingData.length !== filteredRating.length && (
                  <button onClick={() => setShowAll(!showAll)}
                    className="text-xs text-indigo-600 hover:text-indigo-700">
                    {showAll ? `Только \u2265${threshold} игр` : "Показать всех"}
                  </button>
                )}
              </div>
            </div>
            {filteredRating.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">Нет данных для рейтинга</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-2 py-2 text-center font-medium text-gray-500">#</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 cursor-pointer select-none" onClick={() => handleSort("nickname")}>
                        Ник<SortIcon col="nickname" />
                      </th>
                      <th className="px-2 py-2 text-center font-medium text-gray-500 cursor-pointer select-none" onClick={() => handleSort("totalGames")}>
                        Игры<SortIcon col="totalGames" />
                      </th>
                      <th className="px-2 py-2 text-center font-medium text-gray-500 cursor-pointer select-none" onClick={() => handleSort("wins")}>
                        Побед<SortIcon col="wins" />
                      </th>
                      <th className="px-2 py-2 text-center font-medium text-gray-500 cursor-pointer select-none" onClick={() => handleSort("winrate")}>
                        WR%<SortIcon col="winrate" />
                      </th>
                      <th className="px-2 py-2 text-center font-medium text-gray-500 cursor-pointer select-none" onClick={() => handleSort("totalScore")}>
                        Баллы<SortIcon col="totalScore" />
                      </th>
                      <th className="px-2 py-2 text-center font-medium text-gray-500 cursor-pointer select-none" onClick={() => handleSort("avgScore")}>
                        Ср. балл<SortIcon col="avgScore" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRating.map((row, idx) => (
                      <tr key={row.id} className={`border-b last:border-b-0 hover:bg-gray-50 transition-colors ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                        <td className="px-2 py-2 text-center font-medium">{medalEmoji(idx)}</td>
                        <td className="px-2 py-2 text-left font-medium">
                          <button onClick={() => navigate("playerProfile", row.id)}
                            className="text-indigo-600 hover:underline">{row.nickname}</button>
                        </td>
                        <td className="px-2 py-2 text-center">{row.totalGames}</td>
                        <td className="px-2 py-2 text-center">{row.wins}</td>
                        <td className="px-2 py-2 text-center">
                          <span className={row.winrate > 60 ? "text-green-600 font-medium" : row.winrate < 40 ? "text-red-500" : ""}>
                            {row.winrate.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center font-semibold">
                          {row.totalScore % 1 === 0 ? row.totalScore : row.totalScore.toFixed(1)}
                        </td>
                        <td className="px-2 py-2 text-center">{row.avgScore.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Nominations */}
          <div>
            <h3 className="font-semibold mb-3">Номинации</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {NOMINATION_CONFIG.map(({ role, emoji, label }) => {
                const top = nominations[role] || [];
                return (
                  <div key={role} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="text-sm font-semibold mb-2">{emoji} {label}</div>
                    {top.length === 0 ? (
                      <p className="text-xs text-gray-400">Мин. {MIN_GAMES_FOR_NOMINATION} игры за роль</p>
                    ) : (
                      <div className="space-y-1.5">
                        {top.map((p, i) => (
                          <div key={p.playerId} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-medium text-gray-400">{i + 1}.</span>
                              <button onClick={() => navigate("playerProfile", p.playerId)}
                                className="text-indigo-600 hover:underline truncate">{p.nickname}</button>
                            </div>
                            <span className="text-xs text-gray-500 shrink-0 ml-1">
                              {p.avgScore.toFixed(2)} <span className="text-gray-400">({p.games})</span>
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
