import { useState } from "react";
import { Plus, Users, UserPlus, Pencil, X, Check } from "lucide-react";
import { Modal, ConfirmDialog, EmptyState, Badge } from "../components/ui";
import { AdminOnly } from "../components/auth/AuthGuard";
import { createPlayer, updatePlayer } from "../lib/queries";

export function PlayerList({ players, games, allGames, navigate, showToast, refreshPlayers }) {
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [nickname, setNickname] = useState("");
  const [realName, setRealName] = useState("");
  const [error, setError] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);

  const openAdd = () => {
    setEditingPlayer(null);
    setNickname("");
    setRealName("");
    setError("");
    setShowModal(true);
  };

  const openEdit = (player) => {
    setEditingPlayer(player);
    setNickname(player.nickname);
    setRealName(player.realName || "");
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("Введите никнейм");
      return;
    }
    const duplicate = players.find(
      (p) =>
        p.nickname.toLowerCase() === trimmed.toLowerCase() &&
        p.id !== editingPlayer?.id
    );
    if (duplicate) {
      setError("Игрок с таким ником уже существует");
      return;
    }

    try {
      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, {
          nickname: trimmed,
          realName: realName.trim() || null,
        });
      } else {
        await createPlayer({
          nickname: trimmed,
          realName: realName.trim() || null,
          isActive: true,
        });
      }
      await refreshPlayers();
      setShowModal(false);
      showToast?.(editingPlayer ? `Игрок «${trimmed}» обновлён` : `Игрок «${trimmed}» добавлен`);
    } catch (err) {
      setError(err.message || "Ошибка сохранения");
    }
  };

  const handleToggleActive = async (player) => {
    try {
      await updatePlayer(player.id, { isActive: !player.isActive });
      await refreshPlayers();
      setConfirmDeactivate(null);
      showToast?.(player.isActive ? `Игрок «${player.nickname}» деактивирован` : `Игрок «${player.nickname}» активирован`);
    } catch (err) {
      setError(err.message || "Ошибка обновления");
    }
  };

  const getPlayerGameCount = (playerId) => {
    return (allGames || games).filter((g) => g.players.some((p) => p.playerId === playerId)).length;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Игроки</h2>
        <AdminOnly>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm">
            <Plus size={16} /> Добавить игрока
          </button>
        </AdminOnly>
      </div>

      {players.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Нет игроков"
          description="Добавьте первого игрока клуба"
          action={
            <AdminOnly>
              <button onClick={openAdd}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm">
                <UserPlus size={16} /> Добавить игрока
              </button>
            </AdminOnly>
          }
        />
      ) : (
        <div className="bg-[#151515] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Ник</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Имя</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Статус</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-zinc-500">Игры</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-zinc-500">Действия</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id}
                    className={`border-b border-zinc-800 last:border-b-0 hover:bg-zinc-800/50 transition-colors ${
                      !player.isActive ? "opacity-50" : ""
                    }`}>
                    <td className="px-4 py-3 font-medium">
                      <button onClick={(e) => { e.stopPropagation(); navigate("playerProfile", player.id); }}
                        className="text-violet-400 hover:text-violet-300 hover:underline">
                        {player.nickname}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{player.realName || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={player.isActive ? "active" : "inactive"}>
                        {player.isActive ? "Активен" : "Неактивен"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{getPlayerGameCount(player.id)}</td>
                    <td className="px-4 py-3">
                      <AdminOnly>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(player)}
                            className="p-1.5 hover:bg-zinc-800 rounded transition-colors" title="Редактировать">
                            <Pencil size={16} className="text-zinc-500" />
                          </button>
                          <button onClick={() => setConfirmDeactivate(player)}
                            className="p-1.5 hover:bg-zinc-800 rounded transition-colors"
                            title={player.isActive ? "Деактивировать" : "Активировать"}>
                            {player.isActive
                              ? <X size={16} className="text-zinc-500" />
                              : <Check size={16} className="text-green-600" />
                            }
                          </button>
                        </div>
                      </AdminOnly>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal
          title={editingPlayer ? "Редактировать игрока" : "Новый игрок"}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-zinc-700 rounded-lg hover:bg-zinc-800 text-zinc-300 text-sm">
                Отмена
              </button>
              <button onClick={handleSave}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm">
                Сохранить
              </button>
            </>
          }>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Никнейм <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setError(""); }}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                placeholder="Игровой ник"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Настоящее имя
              </label>
              <input
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                placeholder="Необязательно"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
        </Modal>
      )}

      {/* Deactivate/Activate Confirm */}
      {confirmDeactivate && (
        <ConfirmDialog
          title={confirmDeactivate.isActive ? "Деактивировать игрока?" : "Активировать игрока?"}
          message={
            confirmDeactivate.isActive
              ? `Игрок «${confirmDeactivate.nickname}» не будет отображаться при создании игр.`
              : `Игрок «${confirmDeactivate.nickname}» снова будет доступен для игр.`
          }
          onConfirm={() => handleToggleActive(confirmDeactivate)}
          onCancel={() => setConfirmDeactivate(null)}
          confirmText={confirmDeactivate.isActive ? "Деактивировать" : "Активировать"}
          danger={confirmDeactivate.isActive}
        />
      )}
    </div>
  );
}
