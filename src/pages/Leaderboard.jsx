import { useState, useMemo } from "react";
import { Trophy, ChevronUp, ChevronDown } from "lucide-react";
import { Badge, EmptyState } from "../components/ui";
import { calcPlayerStats, calcExtendedNominations, calcKillRate, calcThreshold } from "../lib/metrics";
import { NOMINATION_CONFIG, MEDAL_ICON } from "../lib/constants";

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

  const selectedSeason = useMemo(() => {
    if (seasonFilter === "all") return null;
    return seasons.find((s) => s.id === seasonFilter) || null;
  }, [seasonFilter, seasons]);

  // Build rating data
  const ratingCalc = useMemo(() => {
    const playerIds = new Set();
    activeGames.forEach((g) => g.players.forEach((p) => playerIds.add(p.playerId)));

    const totalGamesInPeriod = activeGames.length;
    const minGames = calcThreshold(selectedSeason, totalGamesInPeriod);

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
  }, [activeGames, players, selectedSeason]);

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
    { key: "winrate", label: "WR%", sortable: true, title: "Процент побед" },
    { key: "totalScore", label: "Баллы", sortable: true },
    { key: "avgScore", label: "Ср. балл", sortable: true, title: "Средний балл за игру" },
    { key: "avgBonus", label: "Ср. доп.", sortable: true, title: "Средний дополнительный балл" },
    { key: "killRate", label: "ПУ%", sortable: false, title: "Процент первых убийств" },
  ];

  const medalColors = ["text-yellow-400", "text-slate-400", "text-amber-600"];
  const renderRank = (idx) => (
    <span className="inline-flex justify-center w-full">
      {idx < 3 ? <MEDAL_ICON size={16} className={medalColors[idx]} /> : idx + 1}
    </span>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold gradient-text">Рейтинг</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-indigo-500/5 border-indigo-500/15 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
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
            className="px-3 py-1.5 rounded-lg text-sm bg-indigo-500/5 border-indigo-500/15 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
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
      {ratingCalc.minGames > 0 && ratingCalc.totalGamesInPeriod > 0 && (
        <div className="flex items-center justify-between mb-4 bg-indigo-500/5 border border-indigo-500/10 rounded-lg px-3 py-2">
          <span className="text-sm text-slate-400">
            {selectedSeason?.ratingThresholdType === 'percent'
              ? `Порог: ${ratingCalc.minGames} из ${ratingCalc.totalGamesInPeriod} игр (${selectedSeason.ratingThresholdValue}%)`
              : `Порог: минимум ${ratingCalc.minGames} игр`}
            {!showAll && belowThreshold.length > 0 && (
              <span className="text-slate-500"> · {belowThreshold.length} игрок{belowThreshold.length > 4 ? "ов" : belowThreshold.length > 1 ? "а" : ""} не прошли порог</span>
            )}
          </span>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap ml-2"
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
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-indigo-500/10 bg-indigo-500/5">
                  {columns.map((col) => (
                    <th key={col.key}
                      className={`px-3 py-2.5 font-medium text-slate-400 whitespace-nowrap ${
                        col.key === "nickname" ? "text-left" : "text-center"
                      } ${col.sortable ? "cursor-pointer hover:text-slate-300 select-none" : ""} ${
                        col.key === "rank" ? "sticky left-0 z-20 bg-[#0a0908]" : ""
                      } ${col.key === "nickname" ? "sticky left-[44px] z-20 bg-[#0a0908] border-r border-indigo-500/15" : ""}`}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                      title={col.title}>
                      {col.label}
                      {col.sortable && <SortIcon col={col.key} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, idx) => (
                  <tr key={row.id}
                    className={`border-b border-indigo-500/10 last:border-b-0 hover:bg-indigo-500/5 transition-colors ${
                      idx % 2 === 1 ? "bg-indigo-500/5" : ""
                    }`}>
                    <td className="px-3 py-2.5 text-center font-medium sticky left-0 z-10 bg-[#0a0908]">{renderRank(idx)}</td>
                    <td className="px-3 py-2.5 text-left font-medium sticky left-[44px] z-10 bg-[#0a0908] border-r border-indigo-500/15">
                      <button onClick={() => navigate("playerProfile", row.id)}
                        className="text-indigo-400 hover:text-indigo-300 cursor-pointer hover:underline">
                        {row.nickname}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-center">{row.totalGames}</td>
                    <td className="px-3 py-2.5 text-center">{row.wins}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={
                        row.winrate > 60 ? "text-emerald-400 font-medium" :
                        row.winrate < 40 ? "text-red-400" : ""
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
                        row.avgBonus > 0 ? "text-emerald-400" :
                        row.avgBonus < 0 ? "text-red-400" : ""
                      }>
                        {row.avgBonus.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs">
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
        </div>
      )}

      {/* Nominations */}
      {activeGames.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Номинации</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {NOMINATION_CONFIG.map(({ role, icon: Icon, label }) => {
              const top = extNominations[role] || [];
              return (
                <div key={role} className="glass-card rounded-2xl p-4">
                  <div className="font-semibold mb-2 flex items-center gap-1.5"><Icon size={16} /> {label}</div>
                  {top.length === 0 ? (
                    <p className="text-sm text-slate-500">Мин. {nomMinGames} игр за роль</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-indigo-500/10">
                            <th className="text-left py-1 font-medium text-slate-400 sticky left-0 z-20 bg-[#0a0908]">#</th>
                            <th className="text-left py-1 font-medium text-slate-400 sticky left-[20px] z-20 bg-[#0a0908] border-r border-indigo-500/15">Ник</th>
                            <th className="text-center py-1 font-medium text-slate-400">Игр</th>
                            <th className="text-center py-1 font-medium text-slate-400">Побед</th>
                            <th className="text-center py-1 font-medium text-slate-400">WR%</th>
                            <th className="text-center py-1 font-medium text-slate-400">Ср. балл</th>
                            <th className="text-center py-1 font-medium text-slate-400">Ср. доп.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top.map((p, i) => (
                            <tr key={p.playerId} className="border-b border-indigo-500/10 last:border-b-0">
                              <td className="py-1 font-medium sticky left-0 z-10 bg-[#0a0908]">{i + 1}</td>
                              <td className="py-1 sticky left-[20px] z-10 bg-[#0a0908] border-r border-indigo-500/15">
                                <button onClick={() => navigate("playerProfile", p.playerId)}
                                  className="text-indigo-400 hover:text-indigo-300 cursor-pointer">{p.nickname}</button>
                              </td>
                              <td className="py-1 text-center">{p.games}</td>
                              <td className="py-1 text-center">{p.wins}</td>
                              <td className="py-1 text-center">{p.winrate.toFixed(0)}%</td>
                              <td className="py-1 text-center">{p.avgScore.toFixed(2)}</td>
                              <td className="py-1 text-center">
                                <span className={
                                  p.avgBonus > 0 ? "text-emerald-400" :
                                  p.avgBonus < 0 ? "text-red-400" : ""
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
