import { useState, useMemo, useEffect } from "react";
import { Plus, Sword } from "lucide-react";
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
        <h2 className="text-xl font-bold">Игры</h2>
        {canAdd && (
          <AdminOnly>
            <button onClick={() => navigate("gameForm")}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm">
              <Plus size={16} /> Добавить игру
            </button>
          </AdminOnly>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {/* Season filter */}
        <select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500"
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
          { value: "black", label: "Чёрные" },
        ].map((f) => (
          <button key={f.value} onClick={() => setWinnerFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              winnerFilter === f.value
                ? f.value === "red"
                  ? "bg-red-500/10 text-red-400"
                  : f.value === "black"
                  ? "bg-zinc-700 text-zinc-100"
                  : "bg-violet-500/10 text-violet-400"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}>
            {f.label}
          </button>
        ))}

        {/* Player filter */}
        <select
          value={playerFilter}
          onChange={(e) => setPlayerFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500"
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
            className="px-3 py-1.5 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500"
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
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:ring-2 focus:ring-violet-500 outline-none">
          <option value="date-desc">По дате ↓</option>
          <option value="date-asc">По дате ↑</option>
          <option value="number">По номеру</option>
        </select>

        {filtered.length !== sourceGames.length && (
          <span className="text-sm text-zinc-500 ml-1">
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
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              <Plus size={16} /> Новая игра
            </button>
          ) : null}
        />
      ) : (
        <div className="bg-[#151515] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">№</th>
                  {seasonFilter === "all" && (
                    <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Сезон</th>
                  )}
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Дата</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Победитель</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Игроки</th>
                </tr>
              </thead>
              <tbody>
                {visibleGames.map((game) => (
                  <tr key={game.id}
                    className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    onClick={() => navigate("gameDetail", game.id)}>
                    <td className="px-4 py-3 font-medium">#{game.gameNumber}</td>
                    {seasonFilter === "all" && (
                      <td className="px-4 py-3 text-zinc-400 text-sm">{getSeasonName(game.seasonId)}</td>
                    )}
                    <td className="px-4 py-3">
                      <div className="text-zinc-400">{formatDate(game.date)}</div>
                      {getTournamentName(game.tournamentId) && (
                        <div className="text-xs text-violet-400">{getTournamentName(game.tournamentId)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={game.winner === "red" ? "red" : "black"}>
                        {TEAM_NAMES[game.winner]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-sm truncate max-w-xs">
                      {(() => {
                        const playerNames = game.players.map((p) => {
                          const player = players.find((pl) => pl.id === p.playerId);
                          return player?.nickname || "?";
                        });
                        const display = playerNames.length <= 3
                          ? playerNames.join(", ")
                          : `${playerNames.slice(0, 2).join(", ")} и ещё ${playerNames.length - 2}`;
                        return <span title={playerNames.join(", ")}>{display}</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            Показано {Math.min(visibleCount, filtered.length)} из {filtered.length}
          </span>
          {visibleCount < filtered.length && (
            <button onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              className="px-4 py-2 text-sm text-violet-400 hover:text-violet-300 font-medium hover:bg-violet-500/10 rounded-lg transition-colors">
              Показать ещё {Math.min(PAGE_SIZE, filtered.length - visibleCount)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
