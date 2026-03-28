import { useState, useMemo } from "react";
import { Plus, Award, Trophy } from "lucide-react";
import { Badge, EmptyState } from "../components/ui";
import { AdminOnly } from "../components/auth/AuthGuard";
import { formatDate } from "../lib/utils";

export function TournamentList({ allTournaments, allGames, seasons, players, navigate }) {
  const [seasonFilter, setSeasonFilter] = useState("all");

  const filteredTournaments = useMemo(() => {
    const list = seasonFilter === "all"
      ? allTournaments
      : (allTournaments || []).filter((t) => t.seasonId === seasonFilter);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [seasonFilter, allTournaments]);

  const getTournamentData = (tournament) => {
    const tGames = (allGames || []).filter((g) => g.tournamentId === tournament.id);
    const redWins = tGames.filter((g) => g.winner === "red").length;
    const blackWins = tGames.filter((g) => g.winner === "black").length;
    const draws = tGames.filter((g) => g.winner === "draw").length;
    const total = tGames.length;

    // Find best player by avg score
    let bestPlayer = null;
    if (total > 0) {
      const playerScores = {};
      tGames.forEach((g) => {
        g.players.forEach((p) => {
          if (!playerScores[p.playerId]) playerScores[p.playerId] = { total: 0, games: 0 };
          playerScores[p.playerId].total += p.totalScore;
          playerScores[p.playerId].games += 1;
        });
      });
      let bestId = null;
      let bestAvg = -Infinity;
      for (const [pid, data] of Object.entries(playerScores)) {
        const avg = data.total / data.games;
        if (avg > bestAvg) { bestAvg = avg; bestId = pid; }
      }
      if (bestId) bestPlayer = { id: bestId, avgScore: bestAvg };
    }

    const season = seasons.find((s) => s.id === tournament.seasonId);
    return { tGames, redWins, blackWins, draws, total, bestPlayer, seasonName: season?.name };
  };

  const getPlayerNickname = (playerId) => {
    const p = (players || []).find((pl) => pl.id === playerId);
    return p?.nickname || "?";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold gradient-text">Турниры</h2>
        <AdminOnly>
          <button onClick={() => navigate("tournamentForm")}
            className="flex items-center gap-2 btn-gradient cursor-pointer px-3 py-1.5 rounded-lg text-sm">
            <Plus size={14} /> Создать турнир
          </button>
        </AdminOnly>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border bg-indigo-500/5 border-indigo-500/15 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer">
          <option value="all">Все сезоны</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {filteredTournaments.length === 0 ? (
        <EmptyState icon={Award} title="Нет турниров"
          description="Создайте первый турнир или добавьте турнир при создании игры" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
          {filteredTournaments.map((t) => {
            const data = getTournamentData(t);
            const redPct = data.total > 0 ? (data.redWins / data.total) * 100 : 0;
            const blackPct = data.total > 0 ? (data.blackWins / data.total) * 100 : 0;
            return (
              <div
                key={t.id}
                onClick={() => navigate("tournamentDetail", t.id)}
                className="glass-card glass-card-interactive rounded-2xl p-5 cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-indigo-400">{t.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{formatDate(t.date)}</span>
                      {data.seasonName && seasonFilter === "all" && (
                        <Badge variant="default">{data.seasonName}</Badge>
                      )}
                    </div>
                  </div>
                  <Award size={20} className="text-indigo-400/40 shrink-0" />
                </div>

                {data.total === 0 ? (
                  <p className="text-xs text-slate-500">Нет игр</p>
                ) : (
                  <>
                    {/* Games count */}
                    <div className="text-sm text-slate-300 mb-2">
                      <span className="font-data font-semibold">{data.total}</span> {data.total === 1 ? "игра" : data.total < 5 ? "игры" : "игр"}
                    </div>

                    {/* Red vs Black bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-red-400">Красные {data.redWins}</span>
                        {data.draws > 0 && <span className="text-amber-400">Ничьи {data.draws}</span>}
                        <span className="text-slate-400">Чёрные {data.blackWins}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                        {redPct > 0 && (
                          <div className="h-full bg-red-500 transition-all" style={{ width: `${redPct}%` }} />
                        )}
                        {data.draws > 0 && (
                          <div className="h-full bg-amber-400 transition-all" style={{ width: `${(data.draws / data.total) * 100}%` }} />
                        )}
                        {blackPct > 0 && (
                          <div className="h-full bg-slate-400 transition-all" style={{ width: `${blackPct}%` }} />
                        )}
                      </div>
                    </div>

                    {/* Best player */}
                    {data.bestPlayer && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Trophy size={12} className="text-indigo-400/60" />
                        <span>Лучший:</span>
                        <span className="text-indigo-400">{getPlayerNickname(data.bestPlayer.id)}</span>
                        <span className="font-data text-slate-500">({data.bestPlayer.avgScore.toFixed(2)})</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
