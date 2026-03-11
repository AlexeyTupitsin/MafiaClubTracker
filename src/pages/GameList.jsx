import { useState, useMemo } from "react";
import { Plus, Sword } from "lucide-react";
import { Badge, EmptyState } from "../components/ui";
import { TEAM_NAMES } from "../lib/constants";
import { formatDate } from "../lib/utils";

export function GameList({ games, players, navigate, currentSeason, seasons, currentSeasonId, allGames }) {
  const canAdd = currentSeason?.isActive;
  const [winnerFilter, setWinnerFilter] = useState("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [playerFilter, setPlayerFilter] = useState("all");

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
    return result;
  }, [sourceGames, winnerFilter, playerFilter]);

  const getSeasonName = (seasonId) => {
    const s = seasons.find((x) => x.id === seasonId);
    return s?.name || "?";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Игры</h2>
        {canAdd && (
          <button onClick={() => navigate("gameForm")}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm">
            <Plus size={16} /> Добавить игру
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {/* Season filter */}
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
                  ? "bg-red-100 text-red-700"
                  : f.value === "black"
                  ? "bg-gray-800 text-white"
                  : "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {f.label}
          </button>
        ))}

        {/* Player filter */}
        <select
          value={playerFilter}
          onChange={(e) => setPlayerFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="all">Все игроки</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.nickname}</option>
          ))}
        </select>

        {filtered.length !== sourceGames.length && (
          <span className="text-sm text-gray-400 ml-1">
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
          action={canAdd && sourceGames.length === 0 && (
            <button onClick={() => navigate("gameForm")}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm">
              <Plus size={16} /> Добавить игру
            </button>
          )}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">№</th>
                  {seasonFilter === "all" && (
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Сезон</th>
                  )}
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Дата</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Победитель</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Игроки</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((game) => (
                  <tr key={game.id}
                    className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate("gameDetail", game.id)}>
                    <td className="px-4 py-3 font-medium">#{game.gameNumber}</td>
                    {seasonFilter === "all" && (
                      <td className="px-4 py-3 text-gray-500 text-sm">{getSeasonName(game.seasonId)}</td>
                    )}
                    <td className="px-4 py-3 text-gray-500">{formatDate(game.date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={game.winner === "red" ? "red" : "black"}>
                        {TEAM_NAMES[game.winner]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm truncate max-w-xs">
                      {game.players.map((p) => {
                        const pl = players.find((x) => x.id === p.playerId);
                        return pl?.nickname || "?";
                      }).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
