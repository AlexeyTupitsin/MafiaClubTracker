import { useState } from "react";
import { ArrowLeft, Pencil, Trash2, Sword } from "lucide-react";
import { Badge, ConfirmDialog, EmptyState } from "../components/ui";
import { ROLE_NAMES, TEAM_NAMES, RESULT_NAMES, ROLE_BADGE_VARIANT } from "../lib/constants";
import { getTeam, formatDate } from "../lib/utils";
import { AdminOnly } from "../components/auth/AuthGuard";

export function GameDetail({ game, players, navigate, saveGames, games, currentSeason, showToast }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!game) {
    return (
      <EmptyState
        icon={Sword}
        title="Игра не найдена"
        action={
          <button onClick={() => navigate("games")}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm">
            <ArrowLeft size={16} /> К списку игр
          </button>
        }
      />
    );
  }

  const handleDelete = async () => {
    const num = game.gameNumber;
    const updated = games.filter((g) => g.id !== game.id);
    await saveGames(updated);
    showToast?.(`Игра #${num} удалена`);
    navigate("games");
  };

  const sortedPlayers = [...game.players].sort((a, b) => a.seat - b.seat);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate("games")}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold">Игра #{game.gameNumber}</h2>
        <Badge variant={game.winner === "red" ? "red" : "black"}>
          {TEAM_NAMES[game.winner]} победили
        </Badge>
      </div>
      <p className="text-sm text-gray-500 mb-4 ml-11">{formatDate(game.date)}</p>

      {/* Notes */}
      {game.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
          {game.notes}
        </div>
      )}

      {/* Players table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-center px-3 py-2.5 font-medium text-gray-500">Место</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-500">Игрок</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-500">Роль</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-500">Команда</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-500">Результат</th>
                <th className="text-center px-3 py-2.5 font-medium text-gray-500">База</th>
                <th className="text-center px-3 py-2.5 font-medium text-gray-500">Бонус</th>
                <th className="text-center px-3 py-2.5 font-medium text-gray-500">Итого</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-500">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((gp) => {
                const player = players.find((p) => p.id === gp.playerId);
                const team = getTeam(gp.role);
                return (
                  <tr key={gp.seat}
                    className={`border-b last:border-b-0 ${
                      team === "red" ? "bg-red-50/40" : "bg-gray-50/40"
                    }`}>
                    <td className="px-3 py-2.5 text-center font-medium">{gp.seat}</td>
                    <td className="px-3 py-2.5 font-medium">
                      <button onClick={() => navigate("playerProfile", gp.playerId)}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline">
                        {player?.nickname || "?"}
                      </button>
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
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{gp.bonusComment || ""}</td>
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
          {currentSeason?.isActive && (
            <button onClick={() => navigate("gameForm", game.id)}
              className="flex items-center gap-1.5 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              <Pencil size={14} /> Редактировать
            </button>
          )}
          <button onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm">
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
