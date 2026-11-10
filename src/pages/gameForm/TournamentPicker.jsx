import { Field, Input, Select, DateInput } from "../../components/ui";

const NEW_TOURNAMENT = "__new__";

// Вечер игры: турнир (или новый прямо отсюда) и дата.
// Новый турнир получает дату игры; выбор турнира подставляет его дату в игру.
export function TournamentPicker({
  tournaments, tournamentId, onTournamentChange,
  newMode, onNewModeChange, newName, onNewNameChange, nameError,
  gameDate, onGameDateChange,
}) {
  const list = tournaments || [];

  return (
    <div className="card p-4 sm:p-5 mb-5 grid gap-4 sm:grid-cols-2">
      {!newMode ? (
        <Field label="Турнир" optional>
          <Select
            value={tournamentId}
            onChange={(e) => {
              const value = e.target.value;
              if (value === NEW_TOURNAMENT) {
                onNewModeChange(true);
                onTournamentChange("");
                return;
              }
              onTournamentChange(value);
              const t = list.find((x) => x.id === value);
              if (t?.date) onGameDateChange(t.date);
            }}
          >
            <option value="">Без турнира</option>
            {list.map((t) => (
              <option key={t.id} value={t.id}>{t.name} · {t.date.split("-").reverse().join(".")}</option>
            ))}
            <option value={NEW_TOURNAMENT}>+ Новый турнир…</option>
          </Select>
        </Field>
      ) : (
        <div>
          <Field label="Новый турнир" error={nameError}
            hint={nameError ? null : "Создастся вместе с игрой, с её датой"}>
            <Input
              type="text"
              value={newName}
              onChange={(e) => onNewNameChange(e.target.value)}
              placeholder="Кубок клуба, март"
              maxLength={80}
              autoFocus
            />
          </Field>
          <button
            type="button"
            onClick={() => { onNewModeChange(false); onNewNameChange(""); }}
            className="mt-1.5 text-[13px] text-stone-400 hover:text-stone-200 underline-offset-4 hover:underline cursor-pointer"
          >
            Выбрать из списка
          </button>
        </div>
      )}

      <Field label="Дата игры">
        <DateInput value={gameDate} onChange={onGameDateChange} />
      </Field>
    </div>
  );
}
