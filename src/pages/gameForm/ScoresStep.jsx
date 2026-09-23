import { Badge } from "../../components/ui";
import { ROLE_NAMES, ROLE_BADGE_VARIANT, RESULT_NAMES } from "../../lib/constants";
import { SEAT_COUNT, formatTotal, isBonusInvalid, parseBonus, seatOutcome, today } from "./gameFormLogic";

const SEAT_NUMBERS = Array.from({ length: SEAT_COUNT }, (_, i) => i + 1);

const inputClass = "bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50";
const dateButtonClass = "px-2 py-0.5 bg-slate-800/30 hover:bg-indigo-500/5 text-slate-400 rounded text-xs transition-colors";

function resultClass(result, strong) {
  if (result === "win") return strong ? "text-emerald-400 font-medium" : "text-emerald-400 text-xs";
  if (result === "draw") return strong ? "text-amber-400 font-medium" : "text-amber-400 text-xs";
  return strong ? "text-red-400" : "text-red-400 text-xs";
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function FirstKillToggle({ active, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${className} ${
        active ? "border-red-500 bg-red-500" : "border-indigo-500/15 hover:border-red-500/50"
      }`}
    >
      {active && <span className="w-2 h-2 rounded-full bg-white" />}
    </button>
  );
}

// Три места «лучшего хода»: без своего места и без уже выбранных в соседних полях
function BestMoveSelects({ seatNumber, values, onChange, selectClassName }) {
  return values.map((value, i) => {
    const usedByOthers = values.filter((v, j) => j !== i && v);
    return (
      <select
        key={i}
        value={value ?? ""}
        onChange={(e) => onChange(i, e.target.value ? Number(e.target.value) : null)}
        className={selectClassName}
      >
        <option value="">—</option>
        {SEAT_NUMBERS
          .filter((s) => s !== seatNumber)
          .filter((s) => s === value || !usedByOthers.includes(s))
          .map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  });
}

function BonusInput({ value, onChange, onToggleSign, inputClassName, signClassName }) {
  return (
    <>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.0"
        className={`${inputClassName} ${isBonusInvalid(value) ? "border-red-500" : "border-indigo-500/15"}`}
      />
      <button type="button" onClick={onToggleSign} className={signClassName}>±</button>
    </>
  );
}

// Шаг 3: доп. баллы, первоубиенный, лучший ход, дата и комментарий
export function ScoresStep({
  seats, roles, winner, bonusScores, bonusComments,
  onBonusChange, onToggleSign, onCommentChange, getPlayerName,
  trackFirstKill, trackBestMove, firstKilled, onFirstKilledToggle, bestMoves, onBestMoveChange,
  gameDate, onGameDateChange, notes, onNotesChange,
}) {
  // Лучший ход без первоубиенного не бывает — колонка только при обоих флагах
  const showBestMoveColumn = trackBestMove && trackFirstKill;

  const rows = seats.map((seat, idx) => {
    const role = roles[idx];
    const { result, baseScore } = seatOutcome(role, winner);
    const total = baseScore + parseBonus(bonusScores[idx]);
    return { seat, idx, role, result, baseScore, total, isFirstKilled: firstKilled === seat.playerId };
  });

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="font-semibold mb-3">Дополнительные баллы</h3>

      {/* Мобильная версия — карточки */}
      <div className="sm:hidden space-y-3">
        {rows.map(({ seat, idx, role, result, baseScore, total, isFirstKilled }) => (
          <div key={idx} className={`bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3 space-y-2 ${isFirstKilled ? "ring-2 ring-red-500/30 bg-red-500/5" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">
                {seat.seat}. {getPlayerName(seat.playerId)}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={ROLE_BADGE_VARIANT[role]}>{ROLE_NAMES[role]}</Badge>
                <span className={resultClass(result, false)}>{RESULT_NAMES[result]}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
              <div>База: <span className="text-slate-200">{baseScore}</span></div>
              <div className="flex items-center gap-1">
                Доп.:{" "}
                <BonusInput
                  value={bonusScores[idx]}
                  onChange={(v) => onBonusChange(idx, v)}
                  onToggleSign={() => onToggleSign(idx)}
                  inputClassName="w-14 bg-slate-800/30 border rounded px-1 py-0.5 text-center text-slate-200"
                  signClassName="text-zinc-400 hover:text-zinc-200 text-sm px-1 py-0.5 rounded"
                />
              </div>
              <div>Итого: <span className="text-slate-200 font-medium">{formatTotal(total)}</span></div>
            </div>
            <input
              type="text"
              placeholder="Комментарий..."
              value={bonusComments[idx]}
              onChange={(e) => onCommentChange(idx, e.target.value)}
              className="w-full bg-slate-800/30 border border-indigo-500/15 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500"
            />
            {trackFirstKill && (
              <div className="flex items-center justify-center pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <FirstKillToggle active={isFirstKilled} onClick={() => onFirstKilledToggle(seat.playerId)} />
                  Первоубиенный
                </label>
              </div>
            )}
            {trackBestMove && isFirstKilled && (
              <div className="pt-2 space-y-1.5">
                <p className="text-xs text-slate-400 text-center">Лучший ход</p>
                <div className="flex items-center gap-2 justify-center">
                  <BestMoveSelects
                    seatNumber={seat.seat}
                    values={bestMoves}
                    onChange={onBestMoveChange}
                    selectClassName="bg-slate-800/50 border border-indigo-500/15 rounded px-1 py-1 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Десктоп — таблица */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-indigo-500/10 bg-indigo-500/5">
              <th className="text-left px-2 py-2 font-medium text-slate-400">Место</th>
              <th className="text-left px-2 py-2 font-medium text-slate-400">Игрок</th>
              <th className="text-left px-2 py-2 font-medium text-slate-400">Роль</th>
              <th className="text-left px-2 py-2 font-medium text-slate-400">Результат</th>
              <th className="text-center px-2 py-2 font-medium text-slate-400">База</th>
              <th className="text-center px-2 py-2 font-medium text-slate-400">Доп.</th>
              <th className="text-center px-2 py-2 font-medium text-slate-400">Итого</th>
              <th className="text-left px-2 py-2 font-medium text-slate-400">Комментарий</th>
              {trackFirstKill && <th className="text-center px-2 py-2 font-medium text-slate-400">ПУ</th>}
              {showBestMoveColumn && <th className="text-center px-2 py-2 font-medium text-slate-400">ЛХ</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ seat, idx, role, result, baseScore, total, isFirstKilled }) => (
              <tr key={idx} className={`border-b border-indigo-500/10 last:border-b-0 ${isFirstKilled ? "bg-red-500/10" : ""}`}>
                <td className="px-2 py-2 text-center font-medium">{seat.seat}</td>
                <td className="px-2 py-2 font-medium">{getPlayerName(seat.playerId)}</td>
                <td className="px-2 py-2">
                  <Badge variant={ROLE_BADGE_VARIANT[role]}>{ROLE_NAMES[role]}</Badge>
                </td>
                <td className="px-2 py-2">
                  <span className={resultClass(result, true)}>{RESULT_NAMES[result]}</span>
                </td>
                <td className="px-2 py-2 text-center">{baseScore}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    <BonusInput
                      value={bonusScores[idx]}
                      onChange={(v) => onBonusChange(idx, v)}
                      onToggleSign={() => onToggleSign(idx)}
                      inputClassName="w-16 bg-indigo-500/5 border rounded px-2 py-1 text-center text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                      signClassName="text-slate-400 hover:text-slate-200 text-sm px-1 py-1 rounded"
                    />
                  </div>
                </td>
                <td className="px-2 py-2 text-center font-semibold">{formatTotal(total)}</td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    value={bonusComments[idx]}
                    onChange={(e) => onCommentChange(idx, e.target.value)}
                    className="w-full bg-indigo-500/5 border border-indigo-500/15 rounded px-2 py-1 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="—"
                  />
                </td>
                {trackFirstKill && (
                  <td className="px-2 py-2 text-center">
                    <FirstKillToggle
                      active={isFirstKilled}
                      onClick={() => onFirstKilledToggle(seat.playerId)}
                      className="mx-auto"
                    />
                  </td>
                )}
                {showBestMoveColumn && (
                  <td className="px-2 py-2 text-center">
                    {isFirstKilled ? (
                      <div className="flex items-center gap-1 justify-center">
                        <BestMoveSelects
                          seatNumber={seat.seat}
                          values={bestMoves}
                          onChange={onBestMoveChange}
                          selectClassName="bg-indigo-500/5 border border-indigo-500/15 rounded px-1 py-0.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500/50 w-12"
                        />
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Дата игры</label>
          <input
            type="date"
            value={gameDate}
            onChange={(e) => onGameDateChange(e.target.value)}
            className={inputClass}
          />
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={() => onGameDateChange(today())} className={dateButtonClass}>
              Сегодня
            </button>
            <button type="button" onClick={() => onGameDateChange(yesterday())} className={dateButtonClass}>
              Вчера
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Комментарий к игре
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
          className={`w-full ${inputClass} resize-none`}
          placeholder="Необязательно"
        />
      </div>
    </div>
  );
}
