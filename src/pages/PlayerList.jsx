import { useState, useMemo } from "react";
import { Plus, Users, UserPlus, Pencil, X, Check, TrendingUp } from "lucide-react";
import { Modal, ConfirmDialog, EmptyState, Badge } from "../components/ui";
import { AdminOnly } from "../components/auth/AuthGuard";
import { createPlayer, updatePlayer } from "../lib/queries";
import { calcPlayerStats } from "../lib/metrics";

function getInitials(nickname) {
  if (!nickname) return "?";
  return nickname.slice(0, 2).toUpperCase();
}

export function PlayerList({ players, games, allGames, navigate, showToast, refreshPlayers }) {
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [nickname, setNickname] = useState("");
  const [realName, setRealName] = useState("");
  const [error, setError] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [search, setSearch] = useState("");

  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return players;
    const q = search.toLowerCase();
    return players.filter(p =>
      p.nickname.toLowerCase().includes(q) ||
      (p.realName && p.realName.toLowerCase().includes(q))
    );
  }, [players, search]);

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

  const playerStatsMap = useMemo(() => {
    const source = allGames || games;
    const map = {};
    for (const p of players) {
      map[p.id] = calcPlayerStats(p.id, source);
    }
    return map;
  }, [players, allGames, games]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold gradient-text">Игроки</h2>
        <AdminOnly>
          <button onClick={openAdd}
            className="flex items-center gap-2 btn-gradient cursor-pointer text-white px-4 py-2 rounded-lg text-sm">
            <Plus size={16} /> Добавить игрока
          </button>
        </AdminOnly>
      </div>

      {players.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Поиск игрока..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 w-48 focus:ring-2 focus:ring-indigo-500/50 outline-none"
          />
        </div>
      )}

      {players.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Нет игроков"
          description="Добавьте первого игрока клуба"
          action={
            <AdminOnly>
              <button onClick={openAdd}
                className="flex items-center gap-2 btn-gradient cursor-pointer text-white px-4 py-2 rounded-lg text-sm">
                <UserPlus size={16} /> Добавить игрока
              </button>
            </AdminOnly>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredPlayers.map((player) => (
            <div
              key={player.id}
              onClick={() => navigate("playerProfile", player.id)}
              className={`glass-card glass-card-interactive rounded-2xl p-4 relative flex flex-col gap-2 ${
                !player.isActive ? "opacity-50" : ""
              }`}
            >
              {/* Top row: avatar + nickname */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-sm font-bold shrink-0">
                  {getInitials(player.nickname)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">
                    {player.nickname}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {player.realName || "\u00A0"}
                  </div>
                </div>
              </div>

              {/* Stats */}
              {(() => {
                const s = playerStatsMap[player.id];
                if (!s || s.totalGames === 0) return (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">Нет игр</span>
                    <Badge variant={player.isActive ? "active" : "inactive"}>
                      {player.isActive ? "Активен" : "Неактивен"}
                    </Badge>
                  </div>
                );
                return (
                  <div className="mt-1 space-y-1.5">
                    {/* Winrate bar */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className="text-slate-400">{s.totalGames} игр</span>
                        <span className={s.winrate >= 50 ? "text-emerald-400 font-medium" : "text-slate-400"}>
                          {s.winrate.toFixed(0)}% побед
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${s.winrate >= 60 ? "bg-emerald-500" : s.winrate >= 45 ? "bg-indigo-500" : "bg-red-500/70"}`}
                          style={{ width: `${Math.min(s.winrate, 100)}%` }}
                        />
                      </div>
                    </div>
                    {/* Avg score + status */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-data">
                        {s.avgScore.toFixed(2)} ср. балл
                      </span>
                      <Badge variant={player.isActive ? "active" : "inactive"}>
                        {player.isActive ? "Активен" : "Неактивен"}
                      </Badge>
                    </div>
                  </div>
                );
              })()}

              {/* Admin action buttons */}
              <AdminOnly>
                <div className="absolute top-2 right-2 flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(player); }}
                    className="p-1.5 hover:bg-indigo-500/10 rounded transition-colors cursor-pointer"
                    title="Редактировать"
                  >
                    <Pencil size={14} className="text-slate-400" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeactivate(player); }}
                    className="p-1.5 hover:bg-indigo-500/10 rounded transition-colors cursor-pointer"
                    title={player.isActive ? "Деактивировать" : "Активировать"}
                  >
                    {player.isActive
                      ? <X size={14} className="text-slate-400" />
                      : <Check size={14} className="text-indigo-400" />
                    }
                  </button>
                </div>
              </AdminOnly>
            </div>
          ))}
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
                className="btn-ghost px-4 py-2 text-sm cursor-pointer">
                Отмена
              </button>
              <button onClick={handleSave}
                className="btn-gradient px-4 py-2 text-sm cursor-pointer">
                Сохранить
              </button>
            </>
          }>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Никнейм <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setError(""); }}
                className="w-full bg-indigo-500/5 border border-indigo-500/15 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none"
                placeholder="Игровой ник"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Настоящее имя
              </label>
              <input
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                className="w-full bg-indigo-500/5 border border-indigo-500/15 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none"
                placeholder="Необязательно"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
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
