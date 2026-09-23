import { useState } from "react";
import { AlertTriangle, Loader, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, ConfirmDialog, Modal } from "../../components/ui";
import { formatDate } from "../../lib/utils";
import { createSeason, updateSeason, deleteSeason, getGameCountBySeason } from "../../lib/queries";
import { SeasonFormFields, seasonInputClass } from "./SeasonFormFields";
import { NEW_SEASON_FORM, isThresholdValid, seasonToForm, thresholdForSave } from "./seasonFormLogic";

const today = () => new Date().toISOString().split("T")[0];

function SeasonRow({ season, isCurrent, onEdit, onEnd, onDelete }) {
  return (
    <div className={`flex items-center justify-between p-3 border border-indigo-500/15 rounded-lg ${
      isCurrent ? "border-indigo-500/30 bg-indigo-500/5" : ""
    }`}>
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium truncate">{season.name}</span>
          <button onClick={onEdit}
            className="p-1 hover:bg-indigo-500/5 rounded transition-colors" title="Редактировать">
            <Pencil size={12} className="text-slate-500" />
          </button>
        </div>
        <div className="text-sm text-slate-400">
          {formatDate(season.startDate)}
          {season.endDate ? ` — ${formatDate(season.endDate)}` : " — ..."}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <Badge variant={season.isActive ? "active" : "inactive"}>
          {season.isActive ? "Активен" : "Завершён"}
        </Badge>
        {season.isActive && (
          <button onClick={onEnd}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 border border-indigo-500/15 rounded hover:bg-indigo-500/5">
            Завершить
          </button>
        )}
        <button onClick={onDelete}
          className="p-1.5 hover:bg-indigo-500/5 rounded transition-colors" title="Удалить">
          <Trash2 size={14} className="text-slate-500" />
        </button>
      </div>
    </div>
  );
}

function ModalFooter({ saving, disabled, onCancel, onSubmit, idleText, busyText }) {
  return (
    <>
      <button onClick={onCancel}
        disabled={saving}
        className="px-4 py-2 btn-ghost cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed">
        Отмена
      </button>
      <button onClick={onSubmit}
        disabled={saving || disabled}
        className="flex items-center gap-2 px-4 py-2 btn-gradient cursor-pointer disabled:bg-slate-800/30 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm">
        {saving && <Loader size={14} className="animate-spin" />}
        {saving ? busyText : idleText}
      </button>
    </>
  );
}

// Сезоны: список, создание, редактирование, завершение, удаление.
// onError — текст для общей плашки ошибки страницы («» — скрыть).
export function SeasonsSection({ seasons, currentSeasonId, setCurrentSeasonId, refreshSeasons, showToast, onError }) {
  const [newForm, setNewForm] = useState(null); // null — окно закрыто
  const [newStartDate, setNewStartDate] = useState(today);
  const [editing, setEditing] = useState(null); // { season, form }
  const [saving, setSaving] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openNew = () => {
    onError("");
    setNewForm(NEW_SEASON_FORM);
  };

  const handleCreate = async () => {
    const name = newForm.name.trim();
    if (!name) { onError("Введите название сезона"); return; }

    setSaving(true);
    try {
      const season = await createSeason({
        name,
        startDate: newStartDate,
        endDate: null,
        isActive: true,
        trackFirstKill: newForm.trackFirstKill,
        trackBestMove: newForm.trackBestMove,
        ratingThresholdType: newForm.thresholdType,
        ratingThresholdValue: thresholdForSave(newForm.thresholdType, newForm.thresholdValue),
      });
      await refreshSeasons();
      setCurrentSeasonId(season.id);
      setNewForm(null);
      onError("");
      showToast("Сезон создан");
    } catch (err) {
      onError(err.message || "Ошибка создания сезона");
      showToast("Ошибка создания сезона: " + (err.message || "неизвестная ошибка"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    const { season, form } = editing;
    const name = form.name.trim();
    if (!name) { onError("Введите название сезона"); return; }

    setSaving(true);
    try {
      await updateSeason(season.id, {
        name,
        trackFirstKill: form.trackFirstKill,
        trackBestMove: form.trackBestMove,
        ratingThresholdType: form.thresholdType,
        ratingThresholdValue: thresholdForSave(form.thresholdType, form.thresholdValue),
      });
      await refreshSeasons();
      setEditing(null);
      showToast("Сезон обновлён");
    } catch (err) {
      onError(err.message || "Ошибка обновления сезона");
    } finally {
      setSaving(false);
    }
  };

  const handleEnd = async (season) => {
    try {
      await updateSeason(season.id, { isActive: false, endDate: today() });
      await refreshSeasons();
      setConfirmEnd(null);
      showToast("Сезон завершён");
    } catch (err) {
      onError(err.message || "Ошибка завершения сезона");
    }
  };

  const handleDelete = async (season) => {
    try {
      const gameCount = await getGameCountBySeason(season.id);
      if (gameCount > 0) {
        onError("Нельзя удалить сезон с играми");
        showToast("Нельзя удалить сезон с играми", "error");
        setConfirmDelete(null);
        return;
      }
      await deleteSeason(season.id);
      const updatedSeasons = await refreshSeasons();
      if (currentSeasonId === season.id) {
        const fallback = updatedSeasons.find((s) => s.isActive) || updatedSeasons[updatedSeasons.length - 1];
        if (fallback) {
          setCurrentSeasonId(fallback.id);
        }
      }
      setConfirmDelete(null);
      onError("");
      showToast("Сезон удалён");
    } catch (err) {
      onError(err.message || "Ошибка удаления сезона");
      showToast("Ошибка удаления сезона: " + (err.message || "неизвестная ошибка"), "error");
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Сезоны</h3>
        <button onClick={openNew}
          className="flex items-center gap-2 btn-gradient cursor-pointer px-3 py-1.5 rounded-lg text-sm">
          <Plus size={14} /> Новый сезон
        </button>
      </div>
      {seasons.length === 0 ? (
        <p className="text-slate-400 text-sm">Нет сезонов</p>
      ) : (
        <div className="space-y-2">
          {seasons.map((season) => (
            <SeasonRow
              key={season.id}
              season={season}
              isCurrent={season.id === currentSeasonId}
              onEdit={() => setEditing({ season, form: seasonToForm(season) })}
              onEnd={() => setConfirmEnd(season)}
              onDelete={() => setConfirmDelete(season)}
            />
          ))}
        </div>
      )}

      {newForm && (
        <Modal
          title="Новый сезон"
          onClose={() => setNewForm(null)}
          footer={
            <ModalFooter
              saving={saving}
              disabled={!isThresholdValid(newForm.thresholdType, newForm.thresholdValue)}
              onCancel={() => setNewForm(null)}
              onSubmit={handleCreate}
              idleText="Создать"
              busyText="Создание..."
            />
          }>
          <div className="space-y-4">
            <SeasonFormFields form={newForm} onChange={setNewForm} idPrefix="new" namePlaceholder="Сезон 2 — Лето 2026">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Дата начала</label>
                <input type="date" value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className={seasonInputClass} />
              </div>
            </SeasonFormFields>
            {seasons.some((s) => s.isActive) && (
              <p className="text-sm text-amber-400 flex items-center gap-1">
                <AlertTriangle size={14} /> Текущий активный сезон будет автоматически завершён
              </p>
            )}
          </div>
        </Modal>
      )}

      {editing && (
        <Modal
          title="Редактировать сезон"
          onClose={() => setEditing(null)}
          footer={
            <ModalFooter
              saving={saving}
              disabled={!editing.form.name.trim() || !isThresholdValid(editing.form.thresholdType, editing.form.thresholdValue)}
              onCancel={() => setEditing(null)}
              onSubmit={handleSaveEdit}
              idleText="Сохранить"
              busyText="Сохранение..."
            />
          }
        >
          <div className="space-y-4">
            <SeasonFormFields
              form={editing.form}
              onChange={(form) => setEditing((prev) => ({ ...prev, form }))}
              idPrefix="edit"
            />
          </div>
        </Modal>
      )}

      {confirmEnd && (
        <ConfirmDialog title="Завершить сезон?"
          message={`Сезон «${confirmEnd.name}» будет завершён. Новые игры нельзя будет добавить в него.`}
          onConfirm={() => handleEnd(confirmEnd)}
          onCancel={() => setConfirmEnd(null)} confirmText="Завершить" />
      )}

      {confirmDelete && (
        <ConfirmDialog title="Удалить сезон?"
          message={`Сезон «${confirmDelete.name}» будет удалён. Это действие нельзя отменить.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)} confirmText="Удалить" danger />
      )}
    </div>
  );
}
