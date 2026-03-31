import { useState, useMemo, useEffect } from "react";
import { Plus, Sword, Circle } from "lucide-react";
import { Badge, EmptyState } from "../components/ui";
import { AdminOnly } from "../components/auth/AuthGuard";
import { useAuth } from "../hooks/useAuth";
import { TEAM_NAMES } from "../lib/constants";
import { formatDate } from "../lib/utils";

export function GameList({ games, players, navigate, currentSeason, seasons, currentSeasonId, allGames, tournaments }) {
  const { isAdmin } = useAuth();
  const canAdd = currentSeason?.isActive;
  const [winnerFilter, setWinnerFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("date-desc");
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Use allGames for display, default to all seasons
  const sourceGames = useMemo(() => {
    if (seasonFilter === "all") return allGames || games;
    if (seasonFilter === currentSeasonId) return games;
    return (allGames || games).filter((g) => g.seasonId === seasonFilter);
  }, [seasonFilter, allGames, games, currentSeasonId]);

  const filtered = useMemo(() => {
    let result = [...sourceGames].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (winnerFilter !== "all") result = result.filter((g) => g.winner === winnerFilter);
    if (playerFilter !== "all") result = result.filter((g) => g.players.some((p) => p.playerId === playerFilter));
    if (tournamentFilter === "__none__") result = result.filter((g) => !g.tournamentId);
    else if (tournamentFilter !== "all") result = result.filter((g) => g.tournamentId === tournamentFilter);
    return result;
  }, [sourceGames, winnerFilter, playerFilter, tournamentFilter]);

  const sortedGames = useMemo(() => {
    const sorted = [...filtered];
    switch (sortOrder) {
      case "date-asc": return sorted.reverse();
      case "number": return sorted.sort((a, b) => (a.gameNumber || 0) - (b.gameNumber || 0));
      default: return sorted; // date-desc is the default order
    }
  }, [filtered, sortOrder]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [winnerFilter, seasonFilter, playerFilter, tournamentFilter]);

  const visibleGames = useMemo(
    () => sortedGames.slice(0, visibleCount),
    [sortedGames, visibleCount]
  );

  const miniStats = useMemo(() => {
    const total = filtered.length;
    if (total === 0) return null;
    const redWins = filtered.filter((g) => g.winner === "red").length;
    const blackWins = filtered.filter((g) => g.winner === "black").length;
    const draws = filtered.filter((g) => g.winner === "draw").length;
    return {
      total,
      redPct: Math.round((redWins / total) * 100),
      blackPct: Math.round((blackWins / total) * 100),
      draws,
    };
  }, [filtered]);

  const getSeasonName = (seasonId) => {
    const s = seasons.find((x) => x.id === seasonId);
    return s?.name || "?";
  };

  const getTournamentName = (tournamentId) => {
    if (!tournamentId) return null;
    const t = (tournaments || []).find((x) => x.id === tournamentId);
    return t?.name || null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold gradient-text">Игры</h2>
        {canAdd && (
          <AdminOnly>
            <button onClick={() => navigate("gameForm")}
              className="flex items-center gap-2 btn-gradient text-white px-4 py-2 rounded-lg text-sm cursor-pointer">
              <Plus size={16} /> Добавить игру
            </button>
          </AdminOnly>
        )}
      </div>

      {/* Mini-stats bar */}
      {miniStats && (
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-sm text-slate-300">
            <Sword size={14} className="text-indigo-400" />
            <span className="font-medium">{miniStats.total}</span> игр
          </div>
          <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-sm">
            <Circle size={10} fill="currentColor" className="text-red-400" />
            <span className="text-red-400 font-medium">Красные {miniStats.redPct}%</span>
          </div>
          <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-sm">
            <Circle size={10} fill="currentColor" className="text-slate-300" />
            <span className="text-slate-300 font-medium">Чёрные {miniStats.blackPct}%</span>
          </div>
          {miniStats.draws > 0 && (
            <div className="glass-card rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-sm">
              <Circle size={10} fill="currentColor" className="text-amber-400" />
              <span className="text-amber-400 font-medium">Ничья {miniStats.draws}</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {/* Season filter */}
        <select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-indigo-500/5 border border-indigo-500/15 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
        >
          <option value="all">Все сезоны</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Winner filter */}
        {[
          { value: "all", label: "Все" },
          { value: "red", label: "Красные" },
          { value: "draw", label: "Ничья" },
          { value: "black", label: "Чёрные" },
        ].map((f) => (
          <button key={f.value} onClick={() => setWinnerFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              winnerFilter === f.value
                ? f.value === "red"
                  ? "bg-red-500/10 text-red-400"
                  : f.value === "draw"
                  ? "bg-amber-500/10 text-amber-400"
                  : f.value === "black"
                  ? "bg-slate-600/30 text-slate-200"
                  : "bg-indigo-500/10 text-indigo-400"
                : "bg-slate-800/30 text-slate-400 hover:bg-slate-700/30"
            }`}>
            {f.label}
          </button>
        ))}

        {/* Player filter */}
        <select
          value={playerFilter}
          onChange={(e) => setPlayerFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-indigo-500/5 border border-indigo-500/15 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
        >
          <option value="all">Все игроки</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.nickname}</option>
          ))}
        </select>

        {/* Tournament filter */}
        {(tournaments || []).length > 0 && (
          <select
            value={tournamentFilter}
            onChange={(e) => setTournamentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm bg-indigo-500/5 border border-indigo-500/15 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
          >
            <option value="all">Все турниры</option>
            <option value="__none__">Без турнира</option>
            {(tournaments || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.date})</option>
            ))}
          </select>
        )}

        {/* Sort order */}
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
          className="bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer">
          <option value="date-desc">По дате ↓</option>
          <option value="date-asc">По дате ↑</option>
          <option value="number">По номеру</option>
        </select>

        {filtered.length !== sourceGames.length && (
          <span className="text-sm text-slate-400 ml-1">
            {filtered.length} из {sourceGames.length}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Sword}
          title="Нет игр"
          description={sourceGames.length === 0
            ? (canAdd ? "Добавьте первую игру!" : "Пока нет игр")
            : "Нет игр по выбранным фильтрам"}
          action={isAdmin && canAdd && sourceGames.length === 0 ? (
            <button onClick={() => navigate("gameForm")}
              className="flex items-center gap-2 btn-gradient text-white px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer">
              <Plus size={16} /> Новая игра
            </button>
          ) : null}
        />
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-indigo-500/10 bg-indigo-500/5">
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Игра</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Победитель</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">MVP</th>
                  {seasonFilter === "all" && (
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Сезон</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleGames.map((game) => {
                  const mvp = game.players.reduce((best, p) => (!best || p.totalScore > best.totalScore) ? p : best, null);
                  const mvpPlayer = mvp ? players.find((pl) => pl.id === mvp.playerId) : null;
                  return (
                    <tr key={game.id}
                      className={`border-b border-indigo-500/10 last:border-b-0 hover:bg-indigo-500/5 cursor-pointer transition-colors border-l-4 ${
                        game.winner === "red" ? "border-l-red-500" : game.winner === "draw" ? "border-l-amber-400" : "border-l-slate-500"
                      }`}
                      onClick={() => navigate("gameDetail", game.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200 text-sm">{formatDate(game.date)}</span>
                          <span className="text-xs text-slate-500 font-data">#{game.gameNumber}</span>
                        </div>
                        {getTournamentName(game.tournamentId) && (
                          <div className="text-xs text-indigo-400 mt-0.5">{getTournamentName(game.tournamentId)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={game.winner === "red" ? "red" : game.winner === "draw" ? "yellow" : "black"}>
                          {TEAM_NAMES[game.winner]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {mvpPlayer && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-indigo-400">{mvpPlayer.nickname}</span>
                            <span className="text-xs text-slate-500 font-data">{mvp.totalScore % 1 === 0 ? mvp.totalScore : mvp.totalScore.toFixed(1)}</span>
                          </div>
                        )}
                      </td>
                      {seasonFilter === "all" && (
                        <td className="px-4 py-3 text-slate-500 text-xs">{getSeasonName(game.seasonId)}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-slate-400">
            Показано {Math.min(visibleCount, filtered.length)} из {filtered.length}
          </span>
          {visibleCount < filtered.length && (
            <button onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              className="px-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer">
              Показать ещё {Math.min(PAGE_SIZE, filtered.length - visibleCount)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
