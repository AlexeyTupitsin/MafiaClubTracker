import { useState } from "react";
import { ArrowLeft, Pencil, Trash2, Sword } from "lucide-react";
import { Badge, ConfirmDialog, EmptyState, PlayerAvatar } from "../components/ui";
import { ROLE_NAMES, TEAM_NAMES, RESULT_NAMES, ROLE_BADGE_VARIANT } from "../lib/constants";
import { getTeam, formatDate } from "../lib/utils";
import { AdminOnly } from "../components/auth/AuthGuard";
import { deleteGame } from "../lib/queries";

export function GameDetail({ game, players, navigate, games, currentSeason, showToast, refreshGames, refreshAllGames, tournaments, goBack }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!game) {
    return (
      <EmptyState
        icon={Sword}
        title="Игра не найдена"
        action={
          <button onClick={() => goBack()}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm cursor-pointer">
            <ArrowLeft size={16} /> Назад
          </button>
        }
      />
    );
  }

  const handleDelete = async () => {
    const num = game.gameNumber;
    try {
      await deleteGame(game.id);
      await refreshGames();
      await refreshAllGames();
      showToast?.(`Игра #${num} удалена`);
      navigate("games");
    } catch (err) {
      console.error("Failed to delete game:", err);
      showToast?.("Ошибка удаления: " + (err.message || "неизвестная ошибка"), "error");
    }
  };

  const sortedPlayers = [...game.players].sort((a, b) => a.seat - b.seat);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => goBack()}
          className="p-1.5 hover:bg-indigo-500/5 rounded transition-colors cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold"><span className="gradient-text">Игра #{game.gameNumber}</span></h2>
        <Badge variant={game.winner === "red" ? "red" : game.winner === "draw" ? "yellow" : "black"}>
          {game.winner === "draw" ? "Ничья" : `${TEAM_NAMES[game.winner]} победили`}
        </Badge>
      </div>
      <p className="text-sm text-slate-400 mb-1 ml-11">{formatDate(game.date)}</p>
      {game.tournamentId && (() => {
        const t = (tournaments || []).find((x) => x.id === game.tournamentId);
        return t ? <p className="text-sm text-indigo-400 mb-4 ml-11">{t.name}</p> : null;
      })()}
      {!game.tournamentId && <div className="mb-3" />}

      {/* Notes */}
      {game.notes && (
        <div className="glass-card !bg-amber-500/5 !border-amber-500/15 rounded-xl p-3 mb-4 text-sm text-amber-300">
          {game.notes}
        </div>
      )}

      {/* Players table */}
      <div className="glass-card rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-indigo-500/10 bg-indigo-500/5">
                <th className="text-center px-3 py-2.5 font-medium text-slate-400 sticky left-0 z-20 bg-[#0a0908]">Место</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-400 sticky left-[44px] z-20 bg-[#0a0908] border-r border-indigo-500/15">Игрок</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-400">Роль</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-400">Команда</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-400">Результат</th>
                <th className="text-center px-3 py-2.5 font-medium text-slate-400" title="Базовый балл">База</th>
                <th className="text-center px-3 py-2.5 font-medium text-slate-400" title="Дополнительный балл">Бонус</th>
                <th className="text-center px-3 py-2.5 font-medium text-slate-400" title="Итоговый балл">Итого</th>
                <th className="text-left px-3 py-2.5 font-medium text-slate-400">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((gp) => {
                const player = players.find((p) => p.id === gp.playerId);
                const team = getTeam(gp.role);
                return (
                  <tr key={gp.seat}
                    className={`border-b border-indigo-500/10 last:border-b-0 ${
                      team === "red" ? "bg-red-500/5" : "bg-slate-800/20"
                    }`}>
                    <td className="px-3 py-2.5 text-center font-medium sticky left-0 z-10 bg-[#0a0908]">{gp.seat}</td>
                    <td className="px-3 py-2.5 font-medium sticky left-[44px] z-10 bg-[#0a0908] border-r border-indigo-500/15">
                      <div className="flex items-center gap-1.5">
                        <PlayerAvatar player={player} size="sm" />
                        <button onClick={() => navigate("playerProfile", gp.playerId)}
                          className="text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors">
                          {player?.nickname || "?"}
                        </button>
                        {game.firstKilled === gp.playerId && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium" title="Первоубиенный">ПУ</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={ROLE_BADGE_VARIANT[gp.role]}>{ROLE_NAMES[gp.role]}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={team === "red" ? "red" : "black"}>
                        {TEAM_NAMES[team]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={
                        gp.result === "win"
                          ? "text-emerald-400 font-medium"
                          : gp.result === "draw"
                          ? "text-amber-400"
                          : "text-red-400"
                      }>
                        {RESULT_NAMES[gp.result]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">{gp.baseScore}</td>
                    <td className="px-3 py-2.5 text-center">
                      {gp.bonusScore !== 0 && (
                        <span className={gp.bonusScore > 0 ? "text-emerald-400" : "text-red-400"}>
                          {gp.bonusScore > 0 ? "+" : ""}{gp.bonusScore % 1 === 0 ? gp.bonusScore : gp.bonusScore.toFixed(1)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold">
                      {gp.totalScore % 1 === 0 ? gp.totalScore : gp.totalScore.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 text-xs">{gp.bonusComment || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <AdminOnly>
        <div className="flex gap-2">
          <button onClick={() => navigate("gameForm", game.id)}
            className="btn-ghost flex items-center gap-1.5 px-4 py-2 text-sm cursor-pointer">
            <Pencil size={14} /> Редактировать
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="btn-ghost border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 flex items-center gap-1.5 px-4 py-2 text-sm cursor-pointer">
            <Trash2 size={14} /> Удалить
          </button>
        </div>
      </AdminOnly>

      {confirmDelete && (
        <ConfirmDialog
          title="Удалить игру?"
          message={`Игра #${game.gameNumber} от ${formatDate(game.date)} будет удалена. Это действие нельзя отменить.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          confirmText="Удалить"
          danger
        />
      )}
    </div>
  );
}
