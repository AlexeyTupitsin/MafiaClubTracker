import { useState, useMemo } from "react";
import { ArrowLeft, Pencil, Trash2, Award, Sword } from "lucide-react";
import { StatCard, Badge, ConfirmDialog, EmptyState } from "../components/ui";
import { calcPlayerStats, calcKillRate } from "../lib/metrics";
import { NOMINATION_CONFIG, TEAM_NAMES, MEDAL_ICON } from "../lib/constants";
import { formatDate } from "../lib/utils";
import { AdminOnly } from "../components/auth/AuthGuard";
import { deleteTournament } from "../lib/queries";

export function TournamentDetail({
  tournament, allGames, players, navigate, seasons, goBack,
  showToast, refreshTournaments, refreshAllTournaments,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!tournament) {
    return (
      <EmptyState icon={Award} title="Турнир не найден"
        action={
          <button onClick={() => goBack()}
            className="flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm">
            <ArrowLeft size={16} /> Назад
          </button>
        }
      />
    );
  }

  const tournamentGames = useMemo(
    () => (allGames || []).filter((g) => g.tournamentId === tournament.id),
    [allGames, tournament.id]
  );

  const totalGames = tournamentGames.length;
  const redWins = tournamentGames.filter((g) => g.winner === "red").length;
  const blackWins = totalGames - redWins;

  const ratingData = useMemo(() => {
    const playerIds = new Set();
    tournamentGames.forEach((g) => g.players.forEach((p) => playerIds.add(p.playerId)));

    return Array.from(playerIds).map((pid) => {
      const player = players.find((p) => p.id === pid);
      const stats = calcPlayerStats(pid, tournamentGames);
      const kr = calcKillRate(pid, tournamentGames, seasons);
      return { id: pid, nickname: player?.nickname || "?", ...stats, killRate: kr };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [tournamentGames, players, seasons]);

  const minGames = useMemo(() => Math.max(1, Math.floor(totalGames * 0.5)), [totalGames]);

  const nominations = useMemo(() => {
    const roles = ["citizen", "sheriff", "mafia", "don"];
    const result = {};
    for (const role of roles) {
      const playerScores = [];
      for (const player of players) {
        const roleGames = tournamentGames.flatMap((g) =>
          g.players.filter((p) => p.playerId === player.id && p.role === role)
        );
        if (roleGames.length < 1) continue;
        const wins = roleGames.filter((p) => p.result === "win").length;
        const totalScore = roleGames.reduce((sum, p) => sum + p.totalScore, 0);
        const totalBonus = roleGames.reduce((sum, p) => sum + p.bonusScore, 0);
        playerScores.push({
          playerId: player.id, nickname: player.nickname,
          games: roleGames.length, wins,
          winrate: (wins / roleGames.length) * 100,
          avgScore: totalScore / roleGames.length,
          avgBonus: totalBonus / roleGames.length,
        });
      }
      result[role] = playerScores.sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
    }
    return result;
  }, [tournamentGames, players]);

  const handleDelete = async () => {
    try {
      await deleteTournament(tournament.id);
      await refreshTournaments?.();
      await refreshAllTournaments?.();
      showToast?.(`Турнир "${tournament.name}" удалён`);
      goBack();
    } catch (err) {
      showToast?.("Ошибка: " + (err.message || "неизвестная ошибка"), "error");
    }
  };

  const medalColors = ["text-yellow-400", "text-zinc-400", "text-amber-600"];
  const renderRank = (idx) => {
    if (idx < 3) return <MEDAL_ICON size={16} className={medalColors[idx]} />;
    return idx + 1;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => goBack()} className="p-1.5 hover:bg-zinc-800 rounded transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold">{tournament.name}</h2>
          <p className="text-sm text-zinc-400">{formatDate(tournament.date)}</p>
        </div>
      </div>

      {tournament.notes && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-300">
          {tournament.notes}
        </div>
      )}

      {/* Stats */}
      {totalGames > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Всего игр" value={totalGames} icon={Sword} />
          <div className="bg-[#151515] border border-zinc-800 rounded-xl p-4">
            <span className="text-sm text-zinc-400">Красные</span>
            <div className="text-2xl font-bold text-red-400">
              {redWins} <span className="text-base font-normal text-red-500/70">
                ({totalGames > 0 ? ((redWins / totalGames) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          </div>
          <div className="bg-[#151515] border border-zinc-800 rounded-xl p-4">
            <span className="text-sm text-zinc-400">Чёрные</span>
            <div className="text-2xl font-bold text-zinc-200">
              {blackWins} <span className="text-base font-normal text-zinc-500">
                ({totalGames > 0 ? ((blackWins / totalGames) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Rating table */}
      {ratingData.length > 0 && (
        <div className="bg-[#151515] border border-zinc-800 rounded-xl p-4">
          <h3 className="font-semibold mb-3">Рейтинг турнира</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-2 py-2 text-center font-medium text-zinc-500">#</th>
                  <th className="px-2 py-2 text-left font-medium text-zinc-500">Ник</th>
                  <th className="px-2 py-2 text-center font-medium text-zinc-500">Игры</th>
                  <th className="px-2 py-2 text-center font-medium text-zinc-500">Побед</th>
                  <th className="px-2 py-2 text-center font-medium text-zinc-500">WR%</th>
                  <th className="px-2 py-2 text-center font-medium text-zinc-500">Баллы</th>
                  <th className="px-2 py-2 text-center font-medium text-zinc-500">Ср. балл</th>
                  <th className="px-2 py-2 text-center font-medium text-zinc-500">Ср. доп.</th>
                </tr>
              </thead>
              <tbody>
                {ratingData.map((row, idx) => (
                  <tr key={row.id} className={`border-b border-zinc-800 last:border-b-0 hover:bg-zinc-800/50 ${idx % 2 === 1 ? "bg-zinc-800/30" : ""}`}>
                    <td className="px-2 py-2 text-center font-medium">{renderRank(idx)}</td>
                    <td className="px-2 py-2 font-medium">
                      <button onClick={() => navigate("playerProfile", row.id)}
                        className="text-violet-400 hover:text-violet-300">{row.nickname}</button>
                    </td>
                    <td className="px-2 py-2 text-center">{row.totalGames}</td>
                    <td className="px-2 py-2 text-center">{row.wins}</td>
                    <td className="px-2 py-2 text-center">
                      <span className={row.winrate > 60 ? "text-emerald-400 font-medium" : row.winrate < 40 ? "text-red-400" : ""}>
                        {row.winrate.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center font-semibold">
                      {row.totalScore % 1 === 0 ? row.totalScore : row.totalScore.toFixed(1)}
                    </td>
                    <td className="px-2 py-2 text-center">{row.avgScore.toFixed(2)}</td>
                    <td className="px-2 py-2 text-center">
                      <span className={row.avgBonus > 0 ? "text-emerald-400" : row.avgBonus < 0 ? "text-red-400" : ""}>
                        {row.avgBonus.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Nominations */}
      {totalGames > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Номинации турнира</h3>
          <p className="text-xs text-zinc-500 mb-3">
            Минимум {minGames} {minGames === 1 ? "игра" : minGames < 5 ? "игры" : "игр"} для участия в номинации
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {NOMINATION_CONFIG.map(({ role, icon: Icon, label }) => {
              const top = nominations[role] || [];
              if (top.length === 0) return null;
              return (
                <div key={role} className="bg-[#151515] border border-zinc-800 rounded-xl p-4">
                  <div className="font-semibold mb-2 flex items-center gap-1.5"><Icon size={16} /> {label}</div>
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
                            <td className="py-1">{i + 1}</td>
                            <td className="py-1">
                              <button onClick={() => navigate("playerProfile", p.playerId)}
                                className="text-violet-400 hover:text-violet-300">{p.nickname}</button>
                            </td>
                            <td className="py-1 text-center">{p.games}</td>
                            <td className="py-1 text-center">{p.wins}</td>
                            <td className="py-1 text-center">{p.winrate.toFixed(0)}%</td>
                            <td className="py-1 text-center">{p.avgScore.toFixed(2)}</td>
                            <td className="py-1 text-center">
                              <span className={p.avgBonus > 0 ? "text-emerald-400" : p.avgBonus < 0 ? "text-red-400" : ""}>
                                {p.avgBonus > 0 ? "+" : ""}{p.avgBonus.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Game list */}
      {tournamentGames.length > 0 && (
        <div className="bg-[#151515] border border-zinc-800 rounded-xl p-4">
          <h3 className="font-semibold mb-3">Игры турнира</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-center px-2 py-2 font-medium text-zinc-500">#</th>
                  <th className="text-left px-2 py-2 font-medium text-zinc-500">Дата</th>
                  <th className="text-left px-2 py-2 font-medium text-zinc-500">Победитель</th>
                </tr>
              </thead>
              <tbody>
                {[...tournamentGames].sort((a, b) => a.gameNumber - b.gameNumber).map((g) => (
                  <tr key={g.id} className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-800/50 cursor-pointer"
                    onClick={() => navigate("gameDetail", g.id)}>
                    <td className="px-2 py-2 text-center font-medium">#{g.gameNumber}</td>
                    <td className="px-2 py-2 text-zinc-400">{formatDate(g.date)}</td>
                    <td className="px-2 py-2">
                      <Badge variant={g.winner === "red" ? "red" : "black"}>
                        {TEAM_NAMES[g.winner]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalGames === 0 && (
        <EmptyState icon={Sword} title="Нет игр" description="В этом турнире пока нет игр" />
      )}

      {/* Actions */}
      <AdminOnly>
        <div className="flex gap-2">
          <button onClick={() => navigate("tournamentForm", tournament.id)}
            className="flex items-center gap-1.5 px-4 py-2 border border-zinc-700 rounded-lg hover:bg-zinc-800 text-zinc-300 text-sm">
            <Pencil size={14} /> Редактировать
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 text-sm">
            <Trash2 size={14} /> Удалить
          </button>
        </div>
      </AdminOnly>

      {confirmDelete && (
        <ConfirmDialog title="Удалить турнир?"
          message={`Турнир "${tournament.name}" будет удалён. Игры останутся.`}
          onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)}
          confirmText="Удалить" danger />
      )}
    </div>
  );
}
