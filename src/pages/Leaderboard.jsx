import { useState, useMemo } from "react";
import { Trophy, ChevronUp, ChevronDown } from "lucide-react";
import { Badge, EmptyState } from "../components/ui";
import { calcPlayerStats, calcExtendedNominations, calcKillRate } from "../lib/metrics";
import { NOMINATION_CONFIG } from "../lib/constants";

export function Leaderboard({ games, players, seasons, currentSeasonId, navigate, allGames, tournaments }) {
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [sortCol, setSortCol] = useState("avgScore");
  const [sortDir, setSortDir] = useState("desc");

  // Determine active game set
  const activeGames = useMemo(() => {
    let result;
    if (seasonFilter === "all") result = allGames;
    else if (seasonFilter === currentSeasonId) result = games;
    else result = allGames.filter((g) => g.seasonId === seasonFilter);

    if (tournamentFilter === "__none__") return result.filter((g) => !g.tournamentId);
    if (tournamentFilter !== "all") return result.filter((g) => g.tournamentId === tournamentFilter);
    return result;
  }, [seasonFilter, tournamentFilter, games, currentSeasonId, allGames]);

  // Build rating data
  const ratingCalc = useMemo(() => {
    const playerIds = new Set();
    activeGames.forEach((g) => g.players.forEach((p) => playerIds.add(p.playerId)));

    const totalGamesInPeriod = activeGames.length;
    const minGames = Math.floor(totalGamesInPeriod * 0.5);

    const all = Array.from(playerIds).map((pid) => {
      const player = players.find((p) => p.id === pid);
      const stats = calcPlayerStats(pid, activeGames);
      const kr = calcKillRate(pid, activeGames, seasons);
      return {
        id: pid,
        nickname: player?.nickname || "?",
        ...stats,
        killRate: kr,
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

  const { nominations: extNominations, minGames: nomMinGames } = useMemo(
    () => calcExtendedNominations(activeGames, players),
    [activeGames, players]
  );

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
    { key: "avgBonus", label: "Ср. доп.", sortable: true },
    { key: "killRate", label: "ПУ%", sortable: false },
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

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-zinc-900 border-zinc-700 text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">Все сезоны</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Tournament filter */}
        {(tournaments || []).length > 0 && (
          <select
            value={tournamentFilter}
            onChange={(e) => setTournamentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm bg-zinc-900 border-zinc-700 text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">Все турниры</option>
            <option value="__none__">Без турнира</option>
            {(tournaments || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.date})</option>
            ))}
          </select>
        )}
      </div>

      {/* Threshold info */}
      {ratingCalc.totalGamesInPeriod > 0 && (
        <div className="flex items-center justify-between mb-4 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
          <span className="text-sm text-zinc-400">
            Порог: {ratingCalc.minGames} из {ratingCalc.totalGamesInPeriod} игр (50%)
            {!showAll && belowThreshold.length > 0 && (
              <span className="text-zinc-500"> · {belowThreshold.length} игрок{belowThreshold.length > 4 ? "ов" : belowThreshold.length > 1 ? "а" : ""} не прошли порог</span>
            )}
          </span>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-violet-400 hover:text-violet-300 font-medium whitespace-nowrap ml-2"
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
        <div className="bg-[#151515] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  {columns.map((col) => (
                    <th key={col.key}
                      className={`px-3 py-2.5 font-medium text-zinc-500 whitespace-nowrap ${
                        col.key === "nickname" ? "text-left" : "text-center"
                      } ${col.sortable ? "cursor-pointer hover:text-zinc-300 select-none" : ""}`}
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
                    className={`border-b border-zinc-800 last:border-b-0 hover:bg-zinc-800/50 transition-colors ${
                      idx % 2 === 1 ? "bg-zinc-900/30" : ""
                    }`}>
                    <td className="px-3 py-2.5 text-center font-medium">{medalEmoji(idx)}</td>
                    <td className="px-3 py-2.5 text-left font-medium">
                      <button onClick={() => navigate("playerProfile", row.id)}
                        className="text-violet-400 hover:text-violet-300 hover:underline">
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
                    <td className="px-3 py-2.5 text-center">
                      <span className={
                        row.avgBonus > 0 ? "text-green-600" :
                        row.avgBonus < 0 ? "text-red-500" : ""
                      }>
                        {row.avgBonus.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs">
                      {row.killRate ? (
                        <span className={
                          row.killRate.killRate > 25 ? "text-red-500" :
                          row.killRate.killRate < 10 ? "text-green-600" : ""
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
        </div>
      )}

      {/* Nominations */}
      {activeGames.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Номинации</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {NOMINATION_CONFIG.map(({ role, emoji, label }) => {
              const top = extNominations[role] || [];
              return (
                <div key={role} className="bg-[#151515] border border-zinc-800 rounded-xl p-4">
                  <div className="font-semibold mb-2">{emoji} {label}</div>
                  {top.length === 0 ? (
                    <p className="text-sm text-zinc-500">Мин. {nomMinGames} игр за роль</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-zinc-800">
                            <th className="text-left py-1 font-medium text-zinc-500">#</th>
                            <th className="text-left py-1 font-medium text-zinc-500">Ник</th>
                            <th className="text-center py-1 font-medium text-zinc-500">Игр</th>
                            <th className="text-center py-1 font-medium text-zinc-500">Побед</th>
                            <th className="text-center py-1 font-medium text-zinc-500">WR%</th>
                            <th className="text-center py-1 font-medium text-zinc-500">Ср. балл</th>
                            <th className="text-center py-1 font-medium text-zinc-500">Ср. доп.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top.map((p, i) => (
                            <tr key={p.playerId} className="border-b border-zinc-800 last:border-b-0">
                              <td className="py-1 font-medium">{i + 1}</td>
                              <td className="py-1">
                                <button onClick={() => navigate("playerProfile", p.playerId)}
                                  className="text-violet-400 hover:text-violet-300">{p.nickname}</button>
                              </td>
                              <td className="py-1 text-center">{p.games}</td>
                              <td className="py-1 text-center">{p.wins}</td>
                              <td className="py-1 text-center">{p.winrate.toFixed(0)}%</td>
                              <td className="py-1 text-center">{p.avgScore.toFixed(2)}</td>
                              <td className="py-1 text-center">
                                <span className={
                                  p.avgBonus > 0 ? "text-green-600" :
                                  p.avgBonus < 0 ? "text-red-500" : ""
                                }>
                                  {p.avgBonus > 0 ? "+" : ""}{p.avgBonus.toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
