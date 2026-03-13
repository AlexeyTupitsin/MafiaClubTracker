import { useState, useMemo } from "react";
import { ArrowLeft, ArrowRightLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { EmptyState, PlayerSelect } from "../components/ui";
import { calcPlayerStats, calcRoleStats, calcPairStats, calcFormTrend, calcKillRate } from "../lib/metrics";
import { ROLE_NAMES } from "../lib/constants";

export function PlayerCompare({ players, allGames, games, seasons, currentSeasonId, navigate, preselectedId, goBack }) {
  const [playerAId, setPlayerAId] = useState(preselectedId || "");
  const [playerBId, setPlayerBId] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("all");

  const activeGames = useMemo(() => {
    if (seasonFilter === "all") return allGames || games;
    if (seasonFilter === currentSeasonId) return games;
    return (allGames || games).filter((g) => g.seasonId === seasonFilter);
  }, [seasonFilter, allGames, games, currentSeasonId]);

  const playerA = players.find((p) => p.id === playerAId);
  const playerB = players.find((p) => p.id === playerBId);
  const bothSelected = playerAId && playerBId && playerAId !== playerBId;

  const statsA = useMemo(() => bothSelected ? calcPlayerStats(playerAId, activeGames) : null, [playerAId, activeGames, bothSelected]);
  const statsB = useMemo(() => bothSelected ? calcPlayerStats(playerBId, activeGames) : null, [playerBId, activeGames, bothSelected]);
  const roleStatsA = useMemo(() => bothSelected ? calcRoleStats(playerAId, activeGames) : [], [playerAId, activeGames, bothSelected]);
  const roleStatsB = useMemo(() => bothSelected ? calcRoleStats(playerBId, activeGames) : [], [playerBId, activeGames, bothSelected]);
  const pairStats = useMemo(() => bothSelected ? calcPairStats(playerAId, playerBId, activeGames) : null, [playerAId, playerBId, activeGames, bothSelected]);
  const formA = useMemo(() => bothSelected ? calcFormTrend(playerAId, activeGames) : null, [playerAId, activeGames, bothSelected]);
  const formB = useMemo(() => bothSelected ? calcFormTrend(playerBId, activeGames) : null, [playerBId, activeGames, bothSelected]);
  const krA = useMemo(() => bothSelected ? calcKillRate(playerAId, activeGames, seasons) : null, [playerAId, activeGames, seasons, bothSelected]);
  const krB = useMemo(() => bothSelected ? calcKillRate(playerBId, activeGames, seasons) : null, [playerBId, activeGames, seasons, bothSelected]);

  const roleChartData = useMemo(() => {
    if (!bothSelected) return [];
    const roles = ["citizen", "sheriff", "mafia", "don"];
    return roles.map((role) => {
      const a = roleStatsA.find((r) => r.role === role) || { winrate: 0 };
      const b = roleStatsB.find((r) => r.role === role) || { winrate: 0 };
      return {
        name: ROLE_NAMES[role],
        [playerA?.nickname || "A"]: Math.round(a.winrate),
        [playerB?.nickname || "B"]: Math.round(b.winrate),
      };
    });
  }, [roleStatsA, roleStatsB, bothSelected, playerA, playerB]);

  const handleSwap = () => {
    setPlayerAId(playerBId);
    setPlayerBId(playerAId);
  };

  const fmtScore = (v) => (v % 1 === 0 ? v : v.toFixed(1));
  const fmtWr = (v) => `${v.toFixed(0)}%`;
  const fmtPairCell = (games, wins, winrate) => games > 0 ? `${games} / ${wins} (${winrate.toFixed(0)}%)` : "—";

  const renderBetter = (valA, valB, higherIsBetter = true) => {
    if (!valA || !valB) return ["", ""];
    const diff = valA - valB;
    if (Math.abs(diff) < 0.01) return ["", ""];
    const aWins = higherIsBetter ? diff > 0 : diff < 0;
    return [aWins ? "text-green-600 font-semibold" : "", !aWins ? "text-green-600 font-semibold" : ""];
  };

  const TrendBadge = ({ trend }) => {
    if (!trend) return <span className="text-gray-400 text-xs">—</span>;
    if (trend.trend === "up") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium"><TrendingUp size={12} />На подъёме</span>;
    if (trend.trend === "down") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium"><TrendingDown size={12} />В спаде</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium"><Minus size={12} />Стабильно</span>;
  };

  const statRows = statsA && statsB ? [
    { label: "Игры", a: statsA.totalGames, b: statsB.totalGames, better: false },
    { label: "Победы", a: statsA.wins, b: statsB.wins, better: true },
    { label: "Winrate %", a: statsA.winrate, b: statsB.winrate, better: true, fmt: (v) => fmtWr(v) },
    { label: "Баллы", a: statsA.totalScore, b: statsB.totalScore, better: true, fmt: fmtScore },
    { label: "Ср. балл", a: statsA.avgScore, b: statsB.avgScore, better: true, fmt: (v) => v.toFixed(2) },
    { label: "Ср. доп.", a: statsA.avgBonus, b: statsB.avgBonus, better: true, fmt: (v) => v.toFixed(2) },
    { label: "KillRate", a: krA?.killRate ?? null, b: krB?.killRate ?? null, better: false, fmt: (v) => v != null ? `${v.toFixed(1)}%` : "—" },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => goBack()} className="p-1.5 hover:bg-gray-100 rounded transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold">Сравнение игроков</h2>
      </div>

      {/* Player selectors */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <PlayerSelect
            value={playerAId}
            onChange={setPlayerAId}
            players={players.filter((p) => p.id !== playerBId)}
            placeholder="Игрок A..."
          />
          <button onClick={handleSwap} disabled={!bothSelected}
            className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors">
            <ArrowRightLeft size={16} />
          </button>
          <PlayerSelect
            value={playerBId}
            onChange={setPlayerBId}
            players={players.filter((p) => p.id !== playerAId)}
            placeholder="Игрок B..."
          />
        </div>
        <div className="mt-3">
          <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="all">Все сезоны</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!bothSelected ? (
        <EmptyState icon={ArrowRightLeft} title="Выберите двух игроков" description="Для сравнения статистики выберите игрока A и игрока B" />
      ) : (
        <>
          {/* Stats comparison */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-semibold mb-3">Общая статистика</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-gray-500">Метрика</th>
                    <th className="text-center py-2 font-medium text-indigo-600">{playerA?.nickname}</th>
                    <th className="text-center py-2 font-medium text-indigo-600">{playerB?.nickname}</th>
                  </tr>
                </thead>
                <tbody>
                  {statRows.map((row) => {
                    const [clsA, clsB] = row.better ? renderBetter(row.a, row.b) : ["", ""];
                    const fmt = row.fmt || ((v) => (typeof v === "number" && v % 1 !== 0 ? v.toFixed(1) : v));
                    return (
                      <tr key={row.label} className="border-b last:border-b-0">
                        <td className="py-2 text-gray-500">{row.label}</td>
                        <td className={`py-2 text-center ${clsA}`}>{fmt(row.a)}</td>
                        <td className={`py-2 text-center ${clsB}`}>{fmt(row.b)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role chart */}
          {roleChartData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold mb-3">Winrate по ролям</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip />
                    <Bar dataKey={playerA?.nickname || "A"} fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={playerB?.nickname || "B"} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Head-to-head */}
          {pairStats && pairStats.totalGames > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold mb-3">Head-to-head ({pairStats.totalGames} совместных игр)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-gray-500">Комбинация</th>
                      <th className="text-center py-2 font-medium text-gray-500">Игр / Побед (WR%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2">Оба 🔴</td>
                      <td className="py-2 text-center">{fmtPairCell(pairStats.bothRed.games, pairStats.bothRed.wins, pairStats.bothRed.winrate)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Оба ⚫</td>
                      <td className="py-2 text-center">{fmtPairCell(pairStats.bothBlack.games, pairStats.bothBlack.wins, pairStats.bothBlack.winrate)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">{playerA?.nickname} 🔴 {playerB?.nickname} ⚫</td>
                      <td className="py-2 text-center">{fmtPairCell(pairStats.aRedBBlack.games, pairStats.aRedBBlack.winsA, pairStats.aRedBBlack.winrateA)}</td>
                    </tr>
                    <tr className="border-b last:border-b-0">
                      <td className="py-2">{playerA?.nickname} ⚫ {playerB?.nickname} 🔴</td>
                      <td className="py-2 text-center">{fmtPairCell(pairStats.aBlackBRed.games, pairStats.aBlackBRed.winsA, pairStats.aBlackBRed.winrateA)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Form trend */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-semibold mb-3">Тренд формы</h3>
            <div className="grid grid-cols-2 gap-4">
              {[{ p: playerA, f: formA }, { p: playerB, f: formB }].map(({ p, f }) => (
                <div key={p?.id || "x"}>
                  <div className="font-medium text-sm mb-2">{p?.nickname}</div>
                  {f ? (
                    <>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {f.recentResults.map((r, i) => (
                          <span key={i} className={`w-6 h-6 flex items-center justify-center rounded text-xs ${
                            r === "win" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                          }`}>
                            {r === "win" ? "✅" : "❌"}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        WR: {f.recentWinrate.toFixed(0)}% vs {f.overallWinrate.toFixed(0)}%
                      </div>
                      <TrendBadge trend={f} />
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">Нет данных</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
