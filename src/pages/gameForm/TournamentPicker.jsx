const NEW_TOURNAMENT = "__new__";

const inputClass = "bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50";

// Выбор турнира для игры или создание нового прямо из формы
export function TournamentPicker({
  tournaments, tournamentId, onTournamentChange,
  newMode, onNewModeChange, newName, onNewNameChange, newDate, onNewDateChange,
}) {
  return (
    <div className="glass-card rounded-2xl p-4 mb-4">
      <label className="block text-sm font-medium text-slate-300 mb-2">Турнир (игровой вечер)</label>
      {!newMode ? (
        <select
          value={tournamentId}
          onChange={(e) => {
            if (e.target.value === NEW_TOURNAMENT) {
              onNewModeChange(true);
              onTournamentChange("");
            } else {
              onTournamentChange(e.target.value);
            }
          }}
          className={`w-full ${inputClass}`}
        >
          <option value="">Без турнира</option>
          {(tournaments || []).map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.date})</option>
          ))}
          <option value={NEW_TOURNAMENT}>+ Новый турнир</option>
        </select>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => onNewNameChange(e.target.value)}
              className={`flex-1 ${inputClass}`}
              placeholder="Название турнира"
              autoFocus
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => onNewDateChange(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            onClick={() => { onNewModeChange(false); onNewNameChange(""); }}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Отмена — выбрать существующий
          </button>
        </div>
      )}
    </div>
  );
}
