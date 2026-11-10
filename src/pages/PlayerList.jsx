import { winrateClass } from "../lib/utils";
import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Users, UserPlus, Pencil, X, Check, Camera } from "lucide-react";
import { Modal, ConfirmDialog, EmptyState, Badge, PlayerAvatar, Field, Input, Button, FormStatus, useFocusFirstError } from "../components/ui";
import { AdminOnly } from "../components/auth/AuthGuard";
import { createPlayer, updatePlayer, uploadPlayerAvatar, deletePlayerAvatar } from "../lib/queries";
import { calcPlayerStats } from "../lib/metrics";

export function PlayerList({ players, games, allGames, navigate, showToast, refreshPlayers }) {
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [nickname, setNickname] = useState("");
  const [realName, setRealName] = useState("");
  const [error, setError] = useState(""); // ошибка поля «Никнейм»
  const [failure, setFailure] = useState(""); // сбой сохранения
  const formBodyRef = useRef(null);
  const [attempt, setAttempt] = useState(0);
  useFocusFirstError(formBodyRef, attempt);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [search, setSearch] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

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
    setFailure("");
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(false);
    setShowModal(true);
  };

  const openEdit = (player) => {
    setEditingPlayer(player);
    setNickname(player.nickname);
    setRealName(player.realName || "");
    setError("");
    setFailure("");
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(false);
    setShowModal(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast?.('Допустимые форматы: JPG, PNG, WebP', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast?.('Файл не должен превышать 10 МБ', 'error');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
  };

  const handleSave = async () => {
    const trimmed = nickname.trim();
    setFailure("");
    if (!trimmed) { setError("Введите ник — так игрока увидят в рейтинге"); setAttempt((n) => n + 1); return; }
    const duplicate = players.find(
      (p) => p.nickname.toLowerCase() === trimmed.toLowerCase() && p.id !== editingPlayer?.id
    );
    if (duplicate) { setError(`Ник «${duplicate.nickname}» уже занят — добавьте букву или цифру`); setAttempt((n) => n + 1); return; }

    try {
      setAvatarUploading(true);
      if (editingPlayer) {
        let newAvatarUrl = editingPlayer.avatarUrl;
        if (removeAvatar) {
          await deletePlayerAvatar(editingPlayer.avatarUrl);
          newAvatarUrl = null;
        } else if (avatarFile) {
          if (editingPlayer.avatarUrl) await deletePlayerAvatar(editingPlayer.avatarUrl);
          newAvatarUrl = await uploadPlayerAvatar(editingPlayer.id, avatarFile);
        }
        await updatePlayer(editingPlayer.id, { nickname: trimmed, realName: realName.trim() || null, avatarUrl: newAvatarUrl });
      } else {
        const newPlayer = await createPlayer({ nickname: trimmed, realName: realName.trim() || null, isActive: true });
        if (avatarFile) {
          const newAvatarUrl = await uploadPlayerAvatar(newPlayer.id, avatarFile);
          await updatePlayer(newPlayer.id, { avatarUrl: newAvatarUrl });
        }
      }
      await refreshPlayers();
      setShowModal(false);
      showToast?.(editingPlayer ? `Игрок «${trimmed}» обновлён` : `Игрок «${trimmed}» добавлен`);
    } catch (err) {
      setFailure("Не сохранилось: " + (err.message || "неизвестная ошибка") + ". Попробуйте ещё раз.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleToggleActive = async (player) => {
    try {
      await updatePlayer(player.id, { isActive: !player.isActive });
      await refreshPlayers();
      setConfirmDeactivate(null);
      showToast?.(player.isActive ? `Игрок «${player.nickname}» деактивирован` : `Игрок «${player.nickname}» активирован`);
    } catch (err) {
      setConfirmDeactivate(null);
      showToast?.("Ошибка обновления: " + (err.message || "неизвестная ошибка"), "error");
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
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <p className="eyebrow">{players.filter((p) => p.isActive).length} в составе</p>
          <h2 className="page-title mt-1.5">Игроки</h2>
        </div>
        <AdminOnly>
          <Button icon={Plus} onClick={openAdd}>Добавить игрока</Button>
        </AdminOnly>
      </div>

      {players.length > 0 && (
        <div className="mb-4">
          <Input
            type="search"
            placeholder="Ник или имя"
            aria-label="Поиск игрока"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:!w-64"
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
              <Button icon={UserPlus} onClick={openAdd}>Добавить первого игрока</Button>
            </AdminOnly>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {filteredPlayers.map((player) => {
            const s = playerStatsMap[player.id];
            return (
              <div key={player.id}
                onClick={() => navigate("playerProfile", player.id)}
                className={`card card-link relative p-4 ${!player.isActive ? "opacity-60" : ""}`}>
                <div className="flex flex-col items-start gap-3">
                  <PlayerAvatar player={player} size="base" clickable={false} />
                  <div className="min-w-0 w-full">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate("playerProfile", player.id); }}
                      className="font-semibold text-stone-50 truncate block w-full text-left cursor-pointer"
                    >
                      {player.nickname}
                    </button>
                    <p className="text-xs text-stone-500 truncate mt-0.5">
                      {player.realName || (player.eloGames > 0 ? `ELO ${Math.round(player.elo)}` : "Новичок")}
                    </p>
                    {!player.isActive && <span className="inline-block mt-1.5"><Badge variant="inactive">Неактивен</Badge></span>}
                  </div>
                </div>

                <dl className="grid grid-cols-3 gap-1 mt-3 pt-3 border-t border-line font-data">
                  <div>
                    <dt className="text-[11px] text-stone-500">Игр</dt>
                    <dd className="text-sm font-semibold text-stone-100">{s?.totalGames ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-stone-500">WR</dt>
                    <dd className={`text-sm font-semibold ${s?.totalGames ? (winrateClass(s.winrate) || "text-stone-100") : "text-stone-500"}`}>
                      {s?.totalGames ? `${s.winrate.toFixed(0)}%` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-stone-500">Ср.</dt>
                    <dd className="text-sm font-semibold text-stone-100">{s?.totalGames ? s.avgScore.toFixed(2) : "—"}</dd>
                  </div>
                </dl>

                <AdminOnly>
                  <div className="absolute top-2 right-2 flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEdit(player)}
                      className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-100 hover:bg-elev-3 rounded-lg cursor-pointer"
                      aria-label={`Редактировать ${player.nickname}`}
                      title="Редактировать"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDeactivate(player)}
                      className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-100 hover:bg-elev-3 rounded-lg cursor-pointer"
                      aria-label={player.isActive ? `Деактивировать ${player.nickname}` : `Активировать ${player.nickname}`}
                      title={player.isActive ? "Деактивировать" : "Активировать"}
                    >
                      {player.isActive ? <X size={14} /> : <Check size={14} className="text-accent-400" />}
                    </button>
                  </div>
                </AdminOnly>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal
          title={editingPlayer ? editingPlayer.nickname : "Новый игрок"}
          description={editingPlayer ? null : "Появится в выборе мест при внесении игры"}
          onClose={() => setShowModal(false)}
          onSubmit={handleSave}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={avatarUploading}>
                Отмена
              </Button>
              <Button type="submit" loading={avatarUploading}>
                {avatarUploading ? "Сохраняем…" : editingPlayer ? "Сохранить игрока" : "Добавить игрока"}
              </Button>
            </>
          }>
          <div ref={formBodyRef} className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-[72px] h-[72px] rounded-full overflow-hidden shrink-0 ring-1 ring-line-strong">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Новое фото" className="w-full h-full object-cover" />
                ) : (editingPlayer?.avatarUrl && !removeAvatar) ? (
                  <img src={editingPlayer.avatarUrl} alt="Текущее фото" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-elev-3 text-stone-300 flex items-center justify-center text-xl font-bold" aria-hidden="true">
                    {nickname.trim() ? nickname.trim().slice(0, 2).toUpperCase() : "?"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <label className="btn-secondary btn-sm cursor-pointer focus-within:outline-2 focus-within:outline-accent-400">
                    <Camera size={14} aria-hidden="true" />
                    {avatarFile || (editingPlayer?.avatarUrl && !removeAvatar) ? "Другое фото" : "Загрузить фото"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleAvatarChange} />
                  </label>
                  {(editingPlayer?.avatarUrl || avatarFile) && !removeAvatar && (
                    <Button variant="ghost" size="sm"
                      onClick={() => { setAvatarFile(null); setAvatarPreview(null); setRemoveAvatar(true); }}
                      className="!text-red-400 hover:!bg-red-500/10">
                      Убрать
                    </Button>
                  )}
                </div>
                <p className="field-hint">JPG, PNG или WebP, до 10 МБ</p>
              </div>
            </div>

            <Field label="Ник" error={error} hint="Под ним игрок будет в рейтинге и протоколах">
              <Input type="text" value={nickname} maxLength={40} autoFocus
                autoCapitalize="none" autoCorrect="off" spellCheck={false}
                onChange={(e) => { setNickname(e.target.value); setError(""); }} />
            </Field>
            <Field label="Настоящее имя" optional hint="Видно рядом с ником при поиске">
              <Input type="text" value={realName} maxLength={60} autoComplete="off"
                onChange={(e) => setRealName(e.target.value)} />
            </Field>
            {failure && <FormStatus>{failure}</FormStatus>}
          </div>
        </Modal>
      )}

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
