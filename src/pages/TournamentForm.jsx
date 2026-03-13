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
        <button onClick={() => goBack()} className="p-1.5 hover:bg-gray-100 rounded transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold">
          {editingTournament ? "Редактирование турнира" : "Новый турнир"}
        </h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название <span className="text-red-500">*</span>
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Кубок клуба — Март 2026" autoFocus />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {!editingTournament && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сезон</label>
            <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.isActive ? " (активен)" : ""}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Необязательно" />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={!name.trim()}
          className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-sm">
          <Check size={16} /> {editingTournament ? "Сохранить" : "Создать турнир"}
        </button>
      </div>
    </div>
  );
}
