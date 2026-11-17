import { useRef, useState } from "react";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmDialog, DateInput, Field, FormStatus, Modal, useFocusFirstError } from "../../components/ui";
import { formatDate, localIsoDate } from "../../lib/utils";
import { createSeason, updateSeason, deleteSeason, getGameCountBySeason } from "../../lib/queries";
import { SeasonFormFields } from "./SeasonFormFields";
import { NEW_SEASON_FORM, seasonToForm, thresholdForSave, validateSeasonForm } from "./seasonFormLogic";

const iconButton = "w-10 h-10 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-200 hover:bg-elev-2 transition-colors cursor-pointer";

function SeasonRow({ season, isCurrent, onEdit, onEnd, onDelete }) {
  return (
    <div className={`flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl border ${
      isCurrent ? "border-accent-400/35 bg-elev-2" : "border-line"
    }`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{season.name}</span>
          {season.isActive && <Badge variant="active">Идёт</Badge>}
        </div>
        <div className="text-[13px] text-stone-500 font-data">
          {formatDate(season.startDate)} — {season.endDate ? formatDate(season.endDate) : "сейчас"}
        </div>
      </div>
      <div className="flex items-center shrink-0">
        {season.isActive && (
          <Button variant="ghost" size="sm" onClick={onEnd} className="mr-1">Завершить</Button>
        )}
        <button type="button" onClick={onEdit} className={iconButton} aria-label={`Изменить сезон «${season.name}»`}>
          <Pencil size={16} />
        </button>
        <button type="button" onClick={onDelete} className={`${iconButton} hover:!text-red-400`} aria-label={`Удалить сезон «${season.name}»`}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// Окно сезона: создание (withStartDate) или редактирование
function SeasonModal({ title, initialForm, withStartDate, warning, submitText, onSubmit, onClose }) {
  const bodyRef = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [startDate, setStartDate] = useState(() => localIsoDate());
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useFocusFirstError(bodyRef, attempt);

  const change = (next) => {
    setForm(next);
    // Ошибка поля уходит, как только его поправили
    if (Object.keys(errors).length) {
      const still = validateSeasonForm(next);
      setErrors((prev) => Object.fromEntries(Object.keys(prev).filter((k) => still[k]).map((k) => [k, still[k]])));
    }
  };

  const submit = async () => {
    const found = validateSeasonForm(form);
    setErrors(found);
    setFailure("");
    if (Object.keys(found).length) { setAttempt((n) => n + 1); return; }
    setSaving(true);
    try {
      await onSubmit(form, startDate);
    } catch (err) {
      setFailure("Не сохранилось: " + (err.message || "неизвестная ошибка") + ". Попробуйте ещё раз.");
      setSaving(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Отмена</Button>
          <Button type="submit" loading={saving}>{saving ? "Сохраняем…" : submitText}</Button>
        </>
      }
    >
      <div ref={bodyRef} className="space-y-5">
        <SeasonFormFields form={form} onChange={change} errors={errors} namePlaceholder="Сезон 3, осень">
          {withStartDate && (
            <Field label="Начало сезона">
              <DateInput value={startDate} onChange={setStartDate} />
            </Field>
          )}
        </SeasonFormFields>
        {warning && (
          <p className="flex gap-2 text-sm text-amber-300 bg-amber-400/8 border border-amber-400/20 rounded-xl px-3 py-2.5">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {warning}
          </p>
        )}
        {failure && <FormStatus>{failure}</FormStatus>}
      </div>
    </Modal>
  );
}

const formToSeason = (form) => ({
  name: form.name.trim(),
  trackFirstKill: form.trackFirstKill,
  trackBestMove: form.trackBestMove,
  ratingThresholdType: form.thresholdType,
  ratingThresholdValue: thresholdForSave(form.thresholdType, form.thresholdValue),
});

// Сезоны: список, создание, редактирование, завершение, удаление.
// onError — текст для общей плашки ошибки страницы («» — скрыть).
export function SeasonsSection({ seasons, currentSeasonId, setCurrentSeasonId, refreshSeasons, showToast, onError }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // season
  const [confirmEnd, setConfirmEnd] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const activeSeason = seasons.find((s) => s.isActive);

  const handleCreate = async (form, startDate) => {
    const season = await createSeason({
      ...formToSeason(form),
      startDate,
      endDate: null,
      isActive: true,
    });
    await refreshSeasons();
    setCurrentSeasonId(season.id);
    setCreating(false);
    onError("");
    showToast("Сезон создан");
  };

  const handleSaveEdit = async (form) => {
    await updateSeason(editing.id, formToSeason(form));
    await refreshSeasons();
    setEditing(null);
    showToast("Сезон обновлён");
  };

  const handleEnd = async (season) => {
    try {
      await updateSeason(season.id, { isActive: false, endDate: localIsoDate() });
      await refreshSeasons();
      setConfirmEnd(null);
      showToast("Сезон завершён");
    } catch (err) {
      setConfirmEnd(null);
      onError(err.message || "Ошибка завершения сезона");
    }
  };

  const handleDelete = async (season) => {
    try {
      const gameCount = await getGameCountBySeason(season.id);
      if (gameCount > 0) {
        showToast(`В сезоне «${season.name}» есть игры — такой сезон не удалить`, "error");
        setConfirmDelete(null);
        return;
      }
      await deleteSeason(season.id);
      const updatedSeasons = await refreshSeasons();
      if (currentSeasonId === season.id) {
        const fallback = updatedSeasons.find((s) => s.isActive) || updatedSeasons[updatedSeasons.length - 1];
        if (fallback) setCurrentSeasonId(fallback.id);
      }
      setConfirmDelete(null);
      onError("");
      showToast("Сезон удалён");
    } catch (err) {
      setConfirmDelete(null);
      onError(err.message || "Ошибка удаления сезона");
      showToast("Ошибка удаления сезона: " + (err.message || "неизвестная ошибка"), "error");
    }
  };

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold">Сезоны</h3>
        <Button size="sm" icon={Plus} onClick={() => { onError(""); setCreating(true); }}>
          Новый сезон
        </Button>
      </div>
      {seasons.length === 0 ? (
        <p className="text-stone-400 text-sm">Сезонов пока нет — создайте первый, чтобы вносить игры.</p>
      ) : (
        <div className="space-y-2">
          {seasons.map((season) => (
            <SeasonRow
              key={season.id}
              season={season}
              isCurrent={season.id === currentSeasonId}
              onEdit={() => setEditing(season)}
              onEnd={() => setConfirmEnd(season)}
              onDelete={() => setConfirmDelete(season)}
            />
          ))}
        </div>
      )}

      {creating && (
        <SeasonModal
          title="Новый сезон"
          initialForm={NEW_SEASON_FORM}
          withStartDate
          warning={activeSeason ? `Сезон «${activeSeason.name}» завершится сегодняшним днём.` : null}
          submitText="Создать сезон"
          onSubmit={handleCreate}
          onClose={() => setCreating(false)}
        />
      )}

      {editing && (
        <SeasonModal
          title="Сезон"
          initialForm={seasonToForm(editing)}
          submitText="Сохранить сезон"
          onSubmit={handleSaveEdit}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmEnd && (
        <ConfirmDialog title="Завершить сезон?"
          message={`Сезон «${confirmEnd.name}» завершится сегодняшним днём. Новые игры в него внести будет нельзя.`}
          onConfirm={() => handleEnd(confirmEnd)}
          onCancel={() => setConfirmEnd(null)} confirmText="Завершить сезон" />
      )}

      {confirmDelete && (
        <ConfirmDialog title="Удалить сезон?"
          message={`Сезон «${confirmDelete.name}» будет удалён. Это не отменить. Сезон с играми удалить нельзя.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)} confirmText="Удалить сезон" danger />
      )}
    </div>
  );
}
