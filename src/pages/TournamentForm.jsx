import { useState, useEffect } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { createTournament, updateTournament } from "../lib/queries";

export function TournamentForm({
  seasons, currentSeasonId, navigate, goBack,
  editingTournament, showToast, refreshTournaments, refreshAllTournaments,
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [seasonId, setSeasonId] = useState(currentSeasonId || "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editingTournament) {
      setName(editingTournament.name);
      setDate(editingTournament.date);
      setSeasonId(editingTournament.seasonId);
      setNotes(editingTournament.notes || "");
    }
  }, [editingTournament]);

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (editingTournament) {
        await updateTournament(editingTournament.id, {
          name: name.trim(),
          date,
          notes: notes.trim() || null,
        });
        showToast?.("Турнир обновлён");
        await refreshTournaments?.();
        await refreshAllTournaments?.();
        goBack();
      } else {
        const t = await createTournament({
          seasonId,
          name: name.trim(),
          date,
          notes: notes.trim() || null,
        });
        showToast?.(`Турнир "${t.name}" создан`);
        await refreshTournaments?.();
        await refreshAllTournaments?.();
        navigate("tournamentDetail", t.id);
      }
    } catch (err) {
      showToast?.("Ошибка: " + (err.message || "неизвестная ошибка"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => goBack()} className="p-1.5 hover:bg-zinc-800 rounded transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold">
          {editingTournament ? "Редактирование турнира" : "Новый турнир"}
        </h2>
      </div>

      <div className="bg-[#151515] border border-zinc-800 rounded-xl p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Название <span className="text-red-500">*</span>
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Кубок клуба — Март 2026" autoFocus />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Дата</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
        </div>

        {!editingTournament && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Сезон</label>
            <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500">
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.isActive ? " (активен)" : ""}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Описание</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            placeholder="Необязательно" />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={!name.trim()}
          className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm">
          <Check size={16} /> {editingTournament ? "Сохранить" : "Создать турнир"}
        </button>
      </div>
    </div>
  );
}
