import { useState, useMemo } from "react";
import { ArrowLeft, ArrowRightLeft, TrendingUp, TrendingDown, Minus, User, Sword, ChevronRight } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { Badge, StatCard, EmptyState } from "../components/ui";
import { calcPlayerStats, calcRoleStats, calcPairStats, calcFormTrend, calcKillRate, calcRoleKillRate } from "../lib/metrics";
import { ROLE_NAMES, ROLE_BADGE_VARIANT, RESULT_NAMES, ROLE_COLORS } from "../lib/constants";
import { formatDate } from "../lib/utils";

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-lg font-semibold text-zinc-100 mb-3 hover:text-violet-400 transition-colors w-full text-left"
      >
        <ChevronRight size={18} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        {title}
      </button>
      {open && <div className="animate-page-enter">{children}</div>}
    </div>
  );
}

export function PlayerProfile({ player, games, players, navigate, seasons, currentSeasonId, allGames, tournaments, goBack }) {
  if (!player) {
    return (
      <EmptyState
        icon={User}
        title="Игрок не найден"
        action={
          <button onClick={() => goBack()}
            className="flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm">
            <ArrowLeft size={16} /> Назад
          </button>
        }
      />
    );
  }

  const [periodFilter, setPeriodFilter] = useState("all");

  const activeGames = useMemo(() => {
    if (periodFilter === "all") return allGames;
    if (periodFilter === currentSeasonId) return games;
    return allGames.filter((g) => g.seasonId === periodFilter);
  }, [periodFilter, games, currentSeasonId, allGames]);

  const stats = useMemo(() => calcPlayerStats(player.id, activeGames), [player.id, activeGames]);
  const roleStats = useMemo(() => calcRoleStats(player.id, activeGames), [player.id, activeGames]);
  const formTrend = useMemo(() => calcFormTrend(player.id, activeGames), [player.id, activeGames]);
  const killRateData = useMemo(() => calcKillRate(player.id, activeGames, seasons), [player.id, activeGames, seasons]);
  const roleKillRates = useMemo(() => calcRoleKillRate(player.id, activeGames, seasons), [player.id, activeGames, seasons]);

  // Tournament stats: last 3 tournaments where player participated
  const tournamentStats = useMemo(() => {
    if (!tournaments || tournaments.length === 0) return [];
    // Find tournaments where this player has games
    const tStats = tournaments
      .map((t) => {
        const tGames = allGames.filter((g) => g.tournamentId === t.id);
        const playerTGames = tGames.filter((g) => g.players.some((p) => p.playerId === player.id));
        if (playerTGames.length === 0) return null;
        const wins = playerTGames.filter((g) => {
          const gp = g.players.find((p) => p.playerId === player.id);
          return gp?.result === "win";
        }).length;
        const totalScore = playerTGames.reduce((sum, g) => {
          const gp = g.players.find((p) => p.playerId === player.id);
          return sum + (gp?.totalScore || 0);
        }, 0);
        return {
          id: t.id,
          name: t.name,
          date: t.date,
          games: playerTGames.length,
          wins,
          winrate: (wins / playerTGames.length) * 100,
          totalScore,
          avgScore: totalScore / playerTGames.length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
    return tStats;
  }, [tournaments, allGames, player.id]);

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
          <button onClick={() => goBack()} className="p-1.5 hover:bg-zinc-800 rounded transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold">{player.nickname}</h2>
            {player.realName && <p className="text-sm text-zinc-400">{player.realName}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm bg-zinc-900 border-zinc-700 text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">Все сезоны</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <EmptyState icon={Sword} title="Нет игр за выбранный период" />
      </div>
    );
  }

  const fmtScore = (v) => (v % 1 === 0 ? v : v.toFixed(1));
  const fmtWr = (v) => `${v.toFixed(0)}%`;
  const fmtPairCell = (games, wins, winrate) => games > 0 ? `${games} / ${wins} (${winrate.toFixed(0)}%)` : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => goBack()} className="p-1.5 hover:bg-zinc-800 rounded transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold">{player.nickname}</h2>
          <p className="text-sm text-zinc-400">
            {player.realName ? `${player.realName} · ` : ""}
            {stats.totalGames} игр · {stats.wins} побед · {fmtWr(stats.winrate)} · {fmtScore(stats.totalScore)} баллов
          </p>
        </div>
      </div>

      {/* Обзор */}
      <Section title="Обзор" defaultOpen={true}>
        {/* Period filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm bg-zinc-900 border-zinc-700 text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">Все сезоны</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
          <StatCard label="Игры" value={stats.totalGames} />
          <StatCard label="Победы" value={stats.wins} />
          <StatCard label="Поражения" value={stats.losses} />
          <StatCard label="Winrate" value={fmtWr(stats.winrate)} />
          <StatCard label="Баллы" value={fmtScore(stats.totalScore)} />
          <StatCard label="Ср. балл" value={stats.avgScore.toFixed(2)} />
          <StatCard label="Ср. доп." value={
            <span className={
              stats.avgBonus > 0 ? "text-green-600" :
              stats.avgBonus < 0 ? "text-red-500" : ""
            }>
              {stats.avgBonus.toFixed(2)}
            </span>
          } />
          {killRateData && (
            <StatCard label="ПУ%" value={
              <span className={
                killRateData.killRate > 25 ? "text-red-500" :
                killRateData.killRate < 10 ? "text-green-600" : ""
              }>
                {killRateData.killRate.toFixed(1)}%
                <span className="text-xs text-zinc-500 ml-1">({killRateData.timesKilled}/{killRateData.gamesTracked})</span>
              </span>
            } />
          )}
        </div>

        {/* Tournament stats */}
        {tournamentStats.length > 0 && (
          <div className="bg-[#151515] border border-zinc-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3">Последние турниры</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-2 py-1.5 font-medium text-zinc-500">Турнир</th>
                    <th className="text-left px-2 py-1.5 font-medium text-zinc-500">Дата</th>
                    <th className="text-center px-2 py-1.5 font-medium text-zinc-500">Игр</th>
                    <th className="text-center px-2 py-1.5 font-medium text-zinc-500">Побед</th>
                    <th className="text-center px-2 py-1.5 font-medium text-zinc-500">WR%</th>
                    <th className="text-center px-2 py-1.5 font-medium text-zinc-500">Баллы</th>
                    <th className="text-center px-2 py-1.5 font-medium text-zinc-500">Ср. балл</th>
                  </tr>
                </thead>
                <tbody>
                  {tournamentStats.map((t) => (
                    <tr key={t.id} className="border-b border-zinc-800 last:border-b-0">
                      <td className="px-2 py-1.5 font-medium">{t.name}</td>
                      <td className="px-2 py-1.5 text-zinc-400">{formatDate(t.date)}</td>
                      <td className="px-2 py-1.5 text-center">{t.games}</td>
                      <td className="px-2 py-1.5 text-center">{t.wins}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={t.winrate > 60 ? "text-green-600 font-medium" : t.winrate < 40 ? "text-red-500" : ""}>
                          {t.winrate.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-center font-semibold">{fmtScore(t.totalScore)}</td>
                      <td className="px-2 py-1.5 text-center">{t.avgScore.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      {/* Результативность */}
      <Section title="Результативность" defaultOpen={true}>
        {/* Role stats table + chart */}
        <div className="bg-[#151515] border border-zinc-800 rounded-xl p-4 mb-4">
          <h3 className="font-semibold mb-3">Статистика по ролям</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-1.5 font-medium text-zinc-500">Роль</th>
                  <th className="text-center py-1.5 font-medium text-zinc-500">Игр</th>
                  <th className="text-center py-1.5 font-medium text-zinc-500">Побед</th>
                  <th className="text-center py-1.5 font-medium text-zinc-500">WR%</th>
                  <th className="text-center py-1.5 font-medium text-zinc-500">Ср. балл</th>
                  <th className="text-center py-1.5 font-medium text-zinc-500">Ср. доп.</th>
                  <th className="text-center py-1.5 font-medium text-zinc-500">ПУ%</th>
                </tr>
              </thead>
              <tbody>
                {roleStats.map((r) => (
                  <tr key={r.role} className="border-b border-zinc-800 last:border-b-0">
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
                    <td className="py-1.5 text-center">
                      {r.games > 0 ? (
                        <span className={
                          r.avgBonus > 0 ? "text-green-600" :
                          r.avgBonus < 0 ? "text-red-500" : ""
                        }>
                          {r.avgBonus.toFixed(2)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-1.5 text-center text-xs">
                      {(() => {
                        const rk = roleKillRates.find((x) => x.role === r.role);
                        if (!rk || rk.killRate === null) return "—";
                        return (
                          <span className={rk.killRate > 25 ? "text-red-500" : rk.killRate < 10 ? "text-green-600" : ""}>
                            {rk.killRate.toFixed(1)}%
                          </span>
                        );
                      })()}
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#a1a1aa' }} unit="%" />
                    <Tooltip
                      formatter={(v, name) => [`${v}%`, "Winrate"]}
                      labelFormatter={(l) => l}
                      contentStyle={{ backgroundColor: '#1f1f1f', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa' }}
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

        {/* Form trend */}
        {formTrend && formTrend.recentGames >= 3 && (
          <div className="bg-[#151515] border border-zinc-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3">Тренд формы (последние {formTrend.recentGames} игр)</h3>
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {formTrend.recentResults.map((r, i) => (
                <span key={i} className={`w-7 h-7 flex items-center justify-center rounded text-sm ${
                  r === "win" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {r === "win" ? "✅" : "❌"}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-zinc-400">WR за {formTrend.recentGames}:</span>{" "}
                <span className="font-medium">{formTrend.recentWinrate.toFixed(0)}%</span>
                <span className="text-zinc-500"> vs {formTrend.overallWinrate.toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-zinc-400">Ср. балл за {formTrend.recentGames}:</span>{" "}
                <span className="font-medium">{formTrend.recentAvgScore.toFixed(2)}</span>
                <span className="text-zinc-500"> vs {formTrend.overallAvgScore.toFixed(2)}</span>
              </div>
              <div>
                {formTrend.trend === "up" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                    <TrendingUp size={12} /> На подъёме
                  </span>
                )}
                {formTrend.trend === "stable" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium">
                    <Minus size={12} /> Стабильно
                  </span>
                )}
                {formTrend.trend === "down" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                    <TrendingDown size={12} /> В спаде
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Compare button */}
        <button onClick={() => navigate("compare", player.id)}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-700 rounded-lg hover:bg-zinc-800 text-zinc-300 text-sm transition-colors mt-4">
          <ArrowRightLeft size={16} /> Сравнить с...
        </button>
      </Section>

      {/* Взаимодействие */}
      <Section title="Взаимодействие" defaultOpen={true}>
        {/* Pair stats */}
        {pairData.length > 0 && (
          <div className="bg-[#151515] border border-zinc-800 rounded-xl p-4 mb-4">
            <h3 className="font-semibold mb-3">Статистика по парам</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-2 py-1.5 font-medium text-zinc-500">Партнёр</th>
                    <th className="text-center px-2 py-1.5 font-medium text-zinc-500">Игр</th>
                    <th className="text-center px-2 py-1.5 font-medium text-zinc-500 whitespace-nowrap">Оба красн.</th>
                    <th className="text-center px-2 py-1.5 font-medium text-zinc-500 whitespace-nowrap">Оба чёрн.</th>
                    <th className="text-center px-2 py-1.5 font-medium text-zinc-500 whitespace-nowrap">Я кр. / Он чёр.</th>
                    <th className="text-center px-2 py-1.5 font-medium text-zinc-500 whitespace-nowrap">Я чёр. / Он кр.</th>
                  </tr>
                </thead>
                <tbody>
                  {pairData.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-800 last:border-b-0">
                      <td className="px-2 py-1.5">
                        <button onClick={() => navigate("playerProfile", p.id)}
                          className="text-violet-400 hover:text-violet-300">{p.nickname}</button>
                      </td>
                      <td className="px-2 py-1.5 text-center font-medium">{p.totalGames}</td>
                      <td className="px-2 py-1.5 text-center text-xs">
                        {fmtPairCell(p.bothRed.games, p.bothRed.wins, p.bothRed.winrate)}
                      </td>
                      <td className="px-2 py-1.5 text-center text-xs">
                        {fmtPairCell(p.bothBlack.games, p.bothBlack.wins, p.bothBlack.winrate)}
                      </td>
                      <td className="px-2 py-1.5 text-center text-xs">
                        {fmtPairCell(p.aRedBBlack.games, p.aRedBBlack.winsA, p.aRedBBlack.winrateA)}
                      </td>
                      <td className="px-2 py-1.5 text-center text-xs">
                        {fmtPairCell(p.aBlackBRed.games, p.aBlackBRed.winsA, p.aBlackBRed.winrateA)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Game history */}
        <div className="bg-[#151515] border border-zinc-800 rounded-xl p-4">
          <h3 className="font-semibold mb-3">История игр</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-2 py-1.5 font-medium text-zinc-500">№</th>
                  <th className="text-left px-2 py-1.5 font-medium text-zinc-500">Дата</th>
                  <th className="text-left px-2 py-1.5 font-medium text-zinc-500">Роль</th>
                  <th className="text-left px-2 py-1.5 font-medium text-zinc-500">Результат</th>
                  <th className="text-center px-2 py-1.5 font-medium text-zinc-500">База</th>
                  <th className="text-center px-2 py-1.5 font-medium text-zinc-500">Бонус</th>
                  <th className="text-center px-2 py-1.5 font-medium text-zinc-500">Итого</th>
                </tr>
              </thead>
              <tbody>
                {gameHistory.map((h) => (
                  <tr key={h.game.id} className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-800/50">
                    <td className="px-2 py-1.5">
                      <button onClick={() => navigate("gameDetail", h.game.id)}
                        className="text-violet-400 hover:text-violet-300 font-medium">
                        #{h.game.gameNumber}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 text-zinc-400">{formatDate(h.game.date)}</td>
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
      </Section>
    </div>
  );
}
