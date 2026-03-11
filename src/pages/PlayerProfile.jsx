import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRightLeft, TrendingUp, TrendingDown, Minus, User, Sword } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { Badge, StatCard, EmptyState } from "../components/ui";
import { calcPlayerStats, calcRoleStats, calcPairStats, calcFormTrend } from "../lib/metrics";
import { ROLE_NAMES, ROLE_BADGE_VARIANT, RESULT_NAMES, ROLE_COLORS } from "../lib/constants";
import { formatDate } from "../lib/utils";
import { safeGet } from "../lib/storage";

export function PlayerProfile({ player, games, players, navigate, seasons, currentSeasonId }) {
  if (!player) {
    return (
      <EmptyState
        icon={User}
        title="Игрок не найден"
        action={
          <button onClick={() => navigate("players")}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm">
            <ArrowLeft size={16} /> К списку игроков
          </button>
        }
      />
    );
  }

  const [periodFilter, setPeriodFilter] = useState("current");
  const [allGamesCache, setAllGamesCache] = useState(null);

  useEffect(() => {
    if (periodFilter !== "all" || allGamesCache) return;
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
  }, [periodFilter, seasons, currentSeasonId, games, allGamesCache]);

  const activeGames = useMemo(() => {
    if (periodFilter === "current") return games;
    if (periodFilter === "all") return allGamesCache || games;
    if (periodFilter === currentSeasonId) return games;
    if (allGamesCache) return allGamesCache.filter((g) => g.seasonId === periodFilter);
    return games;
  }, [periodFilter, games, currentSeasonId, allGamesCache]);

  const stats = useMemo(() => calcPlayerStats(player.id, activeGames), [player.id, activeGames]);
  const roleStats = useMemo(() => calcRoleStats(player.id, activeGames), [player.id, activeGames]);
  const formTrend = useMemo(() => calcFormTrend(player.id, activeGames), [player.id, activeGames]);

  const roleChartData = useMemo(
    () => roleStats.filter((r) => r.games > 0).map((r) => ({
      name: ROLE_NAMES[r.role],
      role: r.role,
      winrate: Math.round(r.winrate),
      games: r.games,
    })),
    [roleStats]
  );

  // Pair stats
  const pairData = useMemo(() => {
    const partnerIds = new Set();
    activeGames.forEach((g) => {
      const inGame = g.players.some((p) => p.playerId === player.id);
      if (inGame) g.players.forEach((p) => { if (p.playerId !== player.id) partnerIds.add(p.playerId); });
    });

    return Array.from(partnerIds)
      .map((pid) => {
        const partner = players.find((p) => p.id === pid);
        const pair = calcPairStats(player.id, pid, activeGames);
        return { id: pid, nickname: partner?.nickname || "?", ...pair };
      })
      .sort((a, b) => b.totalGames - a.totalGames);
  }, [player.id, activeGames, players]);

  // Score progression chart
  const progressionData = useMemo(() => {
    const playerGameEntries = activeGames
      .filter((g) => g.players.some((p) => p.playerId === player.id))
      .sort((a, b) => a.gameNumber - b.gameNumber)
      .map((g) => {
        const gp = g.players.find((p) => p.playerId === player.id);
        return { gameNumber: g.gameNumber, totalScore: gp.totalScore };
      });

    let cumulative = 0;
    return playerGameEntries.map((e) => {
      cumulative += e.totalScore;
      return { name: `#${e.gameNumber}`, score: cumulative, delta: e.totalScore };
    });
  }, [player.id, activeGames]);

  // Game history
  const gameHistory = useMemo(() => {
    return activeGames
      .filter((g) => g.players.some((p) => p.playerId === player.id))
      .sort((a, b) => b.gameNumber - a.gameNumber)
      .map((g) => {
        const gp = g.players.find((p) => p.playerId === player.id);
        return { game: g, ...gp };
      });
  }, [player.id, games]);

  if (stats.totalGames === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("players")} className="p-1.5 hover:bg-gray-100 rounded transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold">{player.nickname}</h2>
            {player.realName && <p className="text-sm text-gray-500">{player.realName}</p>}
          </div>
        </div>
        <EmptyState icon={Sword} title="Игрок ещё не участвовал в играх" />
      </div>
    );
  }

  const fmtScore = (v) => (v % 1 === 0 ? v : v.toFixed(1));
  const fmtWr = (v) => `${v.toFixed(0)}%`;
  const fmtPairCell = (g, w) => g > 0 ? `${g} / ${fmtWr(w)}` : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("players")} className="p-1.5 hover:bg-gray-100 rounded transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold">{player.nickname}</h2>
          <p className="text-sm text-gray-500">
            {player.realName ? `${player.realName} · ` : ""}
            {stats.totalGames} игр · {stats.wins} побед · {fmtWr(stats.winrate)} · {fmtScore(stats.totalScore)} баллов
          </p>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setPeriodFilter("current")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            periodFilter === "current"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Текущий сезон
        </button>
        <button onClick={() => setPeriodFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            periodFilter === "all"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}>
          Все сезоны
        </button>
        {seasons && seasons.length > 1 && (
          <select
            value={periodFilter === "current" || periodFilter === "all" ? "" : periodFilter}
            onChange={(e) => { if (e.target.value) setPeriodFilter(e.target.value); }}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 border-0 outline-none"
          >
            <option value="">Выбрать сезон...</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <StatCard label="Игры" value={stats.totalGames} />
        <StatCard label="Победы" value={stats.wins} />
        <StatCard label="Поражения" value={stats.losses} />
        <StatCard label="Winrate" value={fmtWr(stats.winrate)} />
        <StatCard label="Баллы" value={fmtScore(stats.totalScore)} />
        <StatCard label="Ср. балл" value={stats.avgScore.toFixed(2)} />
      </div>

      {/* Form trend */}
      {formTrend && formTrend.recentGames >= 3 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold mb-3">Тренд формы (последние {formTrend.recentGames} игр)</h3>
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {formTrend.recentResults.map((r, i) => (
              <span key={i} className={`w-7 h-7 flex items-center justify-center rounded text-sm ${
                r === "win" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
              }`}>
                {r === "win" ? "✅" : "❌"}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">WR за {formTrend.recentGames}:</span>{" "}
              <span className="font-medium">{formTrend.recentWinrate.toFixed(0)}%</span>
              <span className="text-gray-400"> vs {formTrend.overallWinrate.toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-gray-500">Ср. балл за {formTrend.recentGames}:</span>{" "}
              <span className="font-medium">{formTrend.recentAvgScore.toFixed(2)}</span>
              <span className="text-gray-400"> vs {formTrend.overallAvgScore.toFixed(2)}</span>
            </div>
            <div>
              {formTrend.trend === "up" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <TrendingUp size={12} /> На подъёме
                </span>
              )}
              {formTrend.trend === "stable" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                  <Minus size={12} /> Стабильно
                </span>
              )}
              {formTrend.trend === "down" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                  <TrendingDown size={12} /> В спаде
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compare button */}
      <button onClick={() => navigate("compare", player.id)}
        className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm transition-colors">
        <ArrowRightLeft size={16} /> Сравнить с...
      </button>

      {/* Role stats table + chart */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold mb-3">Статистика по ролям</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1.5 font-medium text-gray-500">Роль</th>
                <th className="text-center py-1.5 font-medium text-gray-500">Игр</th>
                <th className="text-center py-1.5 font-medium text-gray-500">Побед</th>
                <th className="text-center py-1.5 font-medium text-gray-500">WR%</th>
                <th className="text-center py-1.5 font-medium text-gray-500">Ср. балл</th>
              </tr>
            </thead>
            <tbody>
              {roleStats.map((r) => (
                <tr key={r.role} className="border-b last:border-b-0">
                  <td className="py-1.5">
                    <Badge variant={ROLE_BADGE_VARIANT[r.role]}>{ROLE_NAMES[r.role]}</Badge>
                  </td>
                  <td className="py-1.5 text-center">{r.games}</td>
                  <td className="py-1.5 text-center">{r.wins}</td>
                  <td className="py-1.5 text-center">
                    {r.games > 0 ? fmtWr(r.winrate) : "—"}
                  </td>
                  <td className="py-1.5 text-center">
                    {r.games > 0 ? r.avgScore.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Bar chart for winrate by role */}
          {roleChartData.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip
                    formatter={(v, name) => [`${v}%`, "Winrate"]}
                    labelFormatter={(l) => l}
                  />
                  <Bar dataKey="winrate" radius={[4, 4, 0, 0]}>
                    {roleChartData.map((entry) => (
                      <Cell key={entry.role} fill={ROLE_COLORS[entry.role]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Score progression */}
      {progressionData.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold mb-3">Динамика баллов</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressionData} margin={{ top: 5, right: 15, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v, name, props) => [
                    `${fmtScore(v)} (${props.payload.delta >= 0 ? "+" : ""}${fmtScore(props.payload.delta)})`,
                    "Баллы",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#4f46e5" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Pair stats */}
      {pairData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold mb-3">Статистика по парам</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-2 py-1.5 font-medium text-gray-500">Партнёр</th>
                  <th className="text-center px-2 py-1.5 font-medium text-gray-500">Игр</th>
                  <th className="text-center px-2 py-1.5 font-medium text-gray-500 whitespace-nowrap">🔴🔴</th>
                  <th className="text-center px-2 py-1.5 font-medium text-gray-500 whitespace-nowrap">⚫⚫</th>
                  <th className="text-center px-2 py-1.5 font-medium text-gray-500 whitespace-nowrap">Я🔴 Он⚫</th>
                  <th className="text-center px-2 py-1.5 font-medium text-gray-500 whitespace-nowrap">Я⚫ Он🔴</th>
                </tr>
              </thead>
              <tbody>
                {pairData.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0">
                    <td className="px-2 py-1.5">
                      <button onClick={() => navigate("playerProfile", p.id)}
                        className="text-indigo-600 hover:underline">{p.nickname}</button>
                    </td>
                    <td className="px-2 py-1.5 text-center font-medium">{p.totalGames}</td>
                    <td className="px-2 py-1.5 text-center text-xs">
                      {fmtPairCell(p.bothRed.games, p.bothRed.winrate)}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs">
                      {fmtPairCell(p.bothBlack.games, p.bothBlack.winrate)}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs">
                      {fmtPairCell(p.aRedBBlack.games, p.aRedBBlack.winrateA)}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs">
                      {fmtPairCell(p.aBlackBRed.games, p.aBlackBRed.winrateA)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Game history */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold mb-3">История игр</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-2 py-1.5 font-medium text-gray-500">№</th>
                <th className="text-left px-2 py-1.5 font-medium text-gray-500">Дата</th>
                <th className="text-left px-2 py-1.5 font-medium text-gray-500">Роль</th>
                <th className="text-left px-2 py-1.5 font-medium text-gray-500">Результат</th>
                <th className="text-center px-2 py-1.5 font-medium text-gray-500">База</th>
                <th className="text-center px-2 py-1.5 font-medium text-gray-500">Бонус</th>
                <th className="text-center px-2 py-1.5 font-medium text-gray-500">Итого</th>
              </tr>
            </thead>
            <tbody>
              {gameHistory.map((h) => (
                <tr key={h.game.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-2 py-1.5">
                    <button onClick={() => navigate("gameDetail", h.game.id)}
                      className="text-indigo-600 hover:underline font-medium">
                      #{h.game.gameNumber}
                    </button>
                  </td>
                  <td className="px-2 py-1.5 text-gray-500">{formatDate(h.game.date)}</td>
                  <td className="px-2 py-1.5">
                    <Badge variant={ROLE_BADGE_VARIANT[h.role]}>{ROLE_NAMES[h.role]}</Badge>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={h.result === "win" ? "text-green-600 font-medium" : "text-red-500"}>
                      {RESULT_NAMES[h.result]}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">{h.baseScore}</td>
                  <td className="px-2 py-1.5 text-center">
                    {h.bonusScore !== 0 && (
                      <span className={h.bonusScore > 0 ? "text-green-600" : "text-red-500"}>
                        {h.bonusScore > 0 ? "+" : ""}{fmtScore(h.bonusScore)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center font-semibold">{fmtScore(h.totalScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
