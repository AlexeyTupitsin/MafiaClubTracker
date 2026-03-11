import { useState, useEffect, useMemo } from "react";
import { Trophy, ChevronUp, ChevronDown } from "lucide-react";
import { Badge, EmptyState } from "../components/ui";
import { calcPlayerStats } from "../lib/metrics";
import { safeGet } from "../lib/storage";

export function Leaderboard({ games, players, seasons, currentSeasonId, navigate }) {
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [sortCol, setSortCol] = useState("avgScore");
  const [sortDir, setSortDir] = useState("desc");
  const [allGamesCache, setAllGamesCache] = useState(null);

  // Load all games when "all seasons" selected
  useEffect(() => {
    if (seasonFilter !== "all" || allGamesCache) return;
    async function loadAll() {
      let all = [];
      for (const s of seasons) {
        if (s.id === currentSeasonId) {
          all = all.concat(games);
        } else {
          const sg = await safeGet(`games:${s.id}`, []);
          all = all.concat(sg);
        }
      }
      setAllGamesCache(all);
    }
    loadAll();
  }, [seasonFilter, seasons, currentSeasonId, games, allGamesCache]);

  // Determine active game set
  const activeGames = useMemo(() => {
    if (seasonFilter === "current") return games;
    if (seasonFilter === "all") return allGamesCache || games;
    // specific season — if it's current, use games; otherwise need to load
    if (seasonFilter === currentSeasonId) return games;
    // For non-current specific season, we'd need async load, fall back to cache
    if (allGamesCache) {
      return allGamesCache.filter((g) => g.seasonId === seasonFilter);
    }
    return games;
  }, [seasonFilter, games, currentSeasonId, allGamesCache]);

  // Build rating data
  const ratingCalc = useMemo(() => {
    const playerIds = new Set();
    activeGames.forEach((g) => g.players.forEach((p) => playerIds.add(p.playerId)));

    const totalGamesInPeriod = activeGames.length;
    const minGames = Math.floor(totalGamesInPeriod * 0.5);

    const all = Array.from(playerIds).map((pid) => {
      const player = players.find((p) => p.id === pid);
      const stats = calcPlayerStats(pid, activeGames);
      return {
        id: pid,
        nickname: player?.nickname || "?",
        ...stats,
      };
    });

    return { all, minGames, totalGamesInPeriod };
  }, [activeGames, players]);

  const [showAll, setShowAll] = useState(false);

  const ratingData = useMemo(() => {
    if (showAll) return ratingCalc.all;
    return ratingCalc.all.filter((p) => p.totalGames >= ratingCalc.minGames);
  }, [ratingCalc, showAll]);

  const belowThreshold = useMemo(() => {
    if (showAll) return [];
    return ratingCalc.all.filter((p) => p.totalGames < ratingCalc.minGames);
  }, [ratingCalc, showAll]);

  // Sort
  const sorted = useMemo(() => {
    return [...ratingData].sort((a, b) => {
      let va = a[sortCol];
      let vb = b[sortCol];
      if (typeof va === "string") {
        va = va.toLowerCase();
        vb = vb.toLowerCase();
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [ratingData, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return null;
    return sortDir === "asc"
      ? <ChevronUp size={14} className="inline ml-0.5" />
      : <ChevronDown size={14} className="inline ml-0.5" />;
  };

  const columns = [
    { key: "rank", label: "#", sortable: false },
    { key: "nickname", label: "Ник", sortable: true },
    { key: "totalGames", label: "Игры", sortable: true },
    { key: "wins", label: "Победы", sortable: true },
    { key: "winrate", label: "WR%", sortable: true },
    { key: "totalScore", label: "Баллы", sortable: true },
    { key: "avgScore", label: "Ср. балл", sortable: true },
  ];

  const medalEmoji = (idx) => {
    if (idx === 0) return "🥇";
    if (idx === 1) return "🥈";
    if (idx === 2) return "🥉";
    return idx + 1;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Рейтинг</h2>
      </div>

      {/* Season filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setSeasonFilter("current")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            seasonFilter === "current"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Текущий сезон
        </button>
        <button onClick={() => setSeasonFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            seasonFilter === "all"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Все сезоны
        </button>
        {seasons.length > 1 && (
          <select
            value={seasonFilter === "current" || seasonFilter === "all" ? "" : seasonFilter}
            onChange={(e) => { if (e.target.value) setSeasonFilter(e.target.value); }}
            className="px-3 py-1.5 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Выбрать сезон...</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Threshold info */}
      {ratingCalc.totalGamesInPeriod > 0 && (
        <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-sm text-gray-500">
            Порог: {ratingCalc.minGames} из {ratingCalc.totalGamesInPeriod} игр (50%)
            {!showAll && belowThreshold.length > 0 && (
              <span className="text-gray-400"> · {belowThreshold.length} игрок{belowThreshold.length > 4 ? "ов" : belowThreshold.length > 1 ? "а" : ""} не прошли порог</span>
            )}
          </span>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium whitespace-nowrap ml-2"
          >
            {showAll ? "Только прошедшие порог" : "Показать всех"}
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Пока нет данных для рейтинга"
          description="Добавьте игры, чтобы увидеть рейтинг игроков"
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  {columns.map((col) => (
                    <th key={col.key}
                      className={`px-3 py-2.5 font-medium text-gray-500 whitespace-nowrap ${
                        col.key === "nickname" ? "text-left" : "text-center"
                      } ${col.sortable ? "cursor-pointer hover:text-gray-700 select-none" : ""}`}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}>
                      {col.label}
                      {col.sortable && <SortIcon col={col.key} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, idx) => (
                  <tr key={row.id}
                    className={`border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                      idx % 2 === 1 ? "bg-gray-50/50" : ""
                    }`}>
                    <td className="px-3 py-2.5 text-center font-medium">{medalEmoji(idx)}</td>
                    <td className="px-3 py-2.5 text-left font-medium">
                      <button onClick={() => navigate("playerProfile", row.id)}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline">
                        {row.nickname}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-center">{row.totalGames}</td>
                    <td className="px-3 py-2.5 text-center">{row.wins}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={
                        row.winrate > 60 ? "text-green-600 font-medium" :
                        row.winrate < 40 ? "text-red-500" : ""
                      }>
                        {row.winrate.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold">
                      {row.totalScore % 1 === 0 ? row.totalScore : row.totalScore.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row.avgScore.toFixed(2)}
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
