import { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { createTournament, updateTournament } from "../lib/queries";
import { localIsoDate } from "../lib/utils";
import { Field, Input, Textarea, Select, DateInput, Button, FormStatus, useFocusFirstError } from "../components/ui";

export function TournamentForm({
  seasons, currentSeasonId, navigate, goBack,
  editingTournament, showToast, refreshAllTournaments,
}) {
  const formRef = useRef(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => localIsoDate());
  const [seasonId, setSeasonId] = useState(currentSeasonId || "");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useFocusFirstError(formRef, attempt);

  useEffect(() => {
    if (editingTournament) {
      setName(editingTournament.name);
      setDate(editingTournament.date);
      setSeasonId(editingTournament.seasonId);
      setNotes(editingTournament.notes || "");
    }
  }, [editingTournament]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!name.trim()) next.name = "Назовите турнир — например, «Кубок клуба, март»";
    if (!date) next.date = "Укажите дату турнира";
    if (!editingTournament && !seasonId) next.seasonId = "Выберите сезон";
    setErrors(next);
    setFailure("");
    if (Object.keys(next).length) { setAttempt((n) => n + 1); return; }

    setSaving(true);
    try {
      if (editingTournament) {
        await updateTournament(editingTournament.id, {
          name: name.trim(),
          date,
          notes: notes.trim() || null,
        });
        showToast?.("Турнир обновлён");
        await refreshAllTournaments?.();
        goBack();
      } else {
        const t = await createTournament({
          seasonId,
          name: name.trim(),
          date,
          notes: notes.trim() || null,
        });
        showToast?.(`Турнир «${t.name}» создан`);
        await refreshAllTournaments?.();
        navigate("tournamentDetail", t.id, { replace: true });
      }
    } catch (err) {
      // Введённое остаётся в полях — можно отправить ещё раз
      setFailure("Не сохранилось: " + (err.message || "неизвестная ошибка") + ". Попробуйте ещё раз.");
      setSaving(false);
    }
  };

  const clear = (key) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Назад" onClick={() => goBack()}
          className="w-10 h-10 -ml-2 flex items-center justify-center hover:bg-elev-2 rounded-lg transition-colors cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title">
          {editingTournament ? "Редактирование турнира" : "Новый турнир"}
        </h2>
      </div>

      <div className="card p-5 space-y-5">
        <Field label="Название" error={errors.name}>
          <Input type="text" value={name} autoFocus maxLength={80}
            onChange={(e) => { setName(e.target.value); clear("name"); }}
            placeholder="Кубок клуба, март" />
        </Field>

        <Field label="Дата" error={errors.date}>
          <DateInput value={date} onChange={(v) => { setDate(v); clear("date"); }} />
        </Field>

        {!editingTournament && (
          <Field label="Сезон" error={errors.seasonId}>
            <Select value={seasonId} onChange={(e) => { setSeasonId(e.target.value); clear("seasonId"); }}>
              {!seasonId && <option value="">Выберите сезон</option>}
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.isActive ? " · активен" : ""}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Описание" optional hint="Формат, призы, кто судил — увидят все на странице турнира">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </Field>
      </div>

      {failure && <FormStatus>{failure}</FormStatus>}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button variant="secondary" onClick={() => goBack()} disabled={saving} className="w-full sm:w-auto">
          Отмена
        </Button>
        <Button type="submit" loading={saving} className="w-full sm:w-auto">
          {saving ? "Сохраняем…" : editingTournament ? "Сохранить турнир" : "Создать турнир"}
        </Button>
      </div>
    </form>
  );
}
