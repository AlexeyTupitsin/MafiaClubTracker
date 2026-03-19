import { useState } from "react";
import { ArrowLeft, Pencil, Trash2, Sword } from "lucide-react";
import { Badge, ConfirmDialog, EmptyState } from "../components/ui";
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
            className="flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm">
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
          className="p-1.5 hover:bg-zinc-800 rounded transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold">Игра #{game.gameNumber}</h2>
        <Badge variant={game.winner === "red" ? "red" : "black"}>
          {TEAM_NAMES[game.winner]} победили
        </Badge>
      </div>
      <p className="text-sm text-zinc-400 mb-1 ml-11">{formatDate(game.date)}</p>
      {game.tournamentId && (() => {
        const t = (tournaments || []).find((x) => x.id === game.tournamentId);
        return t ? <p className="text-sm text-violet-400 mb-4 ml-11">{t.name}</p> : null;
      })()}
      {!game.tournamentId && <div className="mb-3" />}

      {/* Notes */}
      {game.notes && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 text-sm text-amber-300">
          {game.notes}
        </div>
      )}

      {/* Players table */}
      <div className="bg-[#151515] border border-zinc-800 rounded-xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-center px-3 py-2.5 font-medium text-zinc-500">Место</th>
                <th className="text-left px-3 py-2.5 font-medium text-zinc-500">Игрок</th>
                <th className="text-left px-3 py-2.5 font-medium text-zinc-500">Роль</th>
                <th className="text-left px-3 py-2.5 font-medium text-zinc-500">Команда</th>
                <th className="text-left px-3 py-2.5 font-medium text-zinc-500">Результат</th>
                <th className="text-center px-3 py-2.5 font-medium text-zinc-500" title="Базовый балл">База</th>
                <th className="text-center px-3 py-2.5 font-medium text-zinc-500" title="Дополнительный балл">Бонус</th>
                <th className="text-center px-3 py-2.5 font-medium text-zinc-500" title="Итоговый балл">Итого</th>
                <th className="text-left px-3 py-2.5 font-medium text-zinc-500">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((gp) => {
                const player = players.find((p) => p.id === gp.playerId);
                const team = getTeam(gp.role);
                return (
                  <tr key={gp.seat}
                    className={`border-b border-zinc-800 last:border-b-0 ${
                      team === "red" ? "bg-red-500/5" : "bg-zinc-800/30"
                    }`}>
                    <td className="px-3 py-2.5 text-center font-medium">{gp.seat}</td>
                    <td className="px-3 py-2.5 font-medium">
                      <button onClick={() => navigate("playerProfile", gp.playerId)}
                        className="text-violet-400 hover:text-violet-300 cursor-pointer transition-colors">
                        {player?.nickname || "?"}
                      </button>
                      {game.firstKilled === gp.playerId && (
                        <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium" title="Первое убийство">ПУ</span>
                      )}
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
                      <span className={gp.result === "win"
                        ? "text-green-600 font-medium"
                        : "text-red-500"}>
                        {RESULT_NAMES[gp.result]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">{gp.baseScore}</td>
                    <td className="px-3 py-2.5 text-center">
                      {gp.bonusScore !== 0 && (
                        <span className={gp.bonusScore > 0 ? "text-green-600" : "text-red-500"}>
                          {gp.bonusScore > 0 ? "+" : ""}{gp.bonusScore % 1 === 0 ? gp.bonusScore : gp.bonusScore.toFixed(1)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold">
                      {gp.totalScore % 1 === 0 ? gp.totalScore : gp.totalScore.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400 text-xs">{gp.bonusComment || ""}</td>
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
