import { Skull } from "lucide-react";
import { Badge, Field, Textarea } from "../../components/ui";
import { ROLE_NAMES, ROLE_BADGE_VARIANT, RESULT_NAMES, TEAM_NAMES } from "../../lib/constants";
import { SEAT_COUNT, formatTotal, isBonusInvalid, parseBonus, seatOutcome } from "./gameFormLogic";
import { SeatNumber } from "./SeatsStep";

const SEAT_NUMBERS = Array.from({ length: SEAT_COUNT }, (_, i) => i + 1);

const RESULT_TONE = { win: "text-emerald-400", draw: "text-amber-300", lose: "text-stone-500" };

// Первоубиенный: на телефоне — подписанная кнопка, в таблице — круглая
function FirstKillToggle({ active, onClick, seat, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={compact ? `Первоубиенный — место ${seat}` : undefined}
      title="Первоубиенный"
      className={compact
        ? `w-9 h-9 mx-auto rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
          active ? "border-red-500/60 bg-red-500/20 text-red-300" : "border-line-strong text-stone-600 hover:text-stone-300 hover:border-stone-500"
        }`
        : `btn-sm rounded-[10px] border cursor-pointer ${
          active ? "border-red-500/50 bg-red-500/15 text-red-300" : "border-line-strong text-stone-400 hover:text-stone-200"
        }`}
    >
      <Skull size={compact ? 16 : 14} aria-hidden="true" />
      {!compact && "Первоубиенный"}
    </button>
  );
}

// Три места «лучшего хода»: без своего места и без уже выбранных в соседних полях
function BestMoveSelects({ seatNumber, values, onChange }) {
  return values.map((value, i) => {
    const usedByOthers = values.filter((v, j) => j !== i && v);
    return (
      <select
        key={i}
        value={value ?? ""}
        onChange={(e) => onChange(i, e.target.value ? Number(e.target.value) : null)}
        aria-label={`Лучший ход, ${i + 1}-е место`}
        className="input input-sm !w-14 text-center font-data !pr-2"
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

function BonusInput({ value, onChange, onToggleSign, seat }) {
  const invalid = isBonusInvalid(value);
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onToggleSign}
        aria-label={`Сменить знак доп. балла, место ${seat}`}
        className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-elev-3 font-data cursor-pointer">
        ±
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        aria-label={`Доп. балл, место ${seat}`}
        aria-invalid={invalid || undefined}
        className="input input-sm !w-16 text-center font-data"
      />
    </div>
  );
}

// Шаг 3: доп. баллы, первоубиенный, лучший ход, комментарий
export function ScoresStep({
  seats, roles, winner, bonusScores, bonusComments,
  onBonusChange, onToggleSign, onCommentChange, getPlayerName,
  trackFirstKill, trackBestMove, firstKilled, onFirstKilledToggle, bestMoves, onBestMoveChange,
  notes, onNotesChange,
}) {
  // Лучший ход без первоубиенного не бывает — колонка только при обоих флагах
  const showBestMoveColumn = trackBestMove && trackFirstKill;

  const rows = seats.map((seat, idx) => {
    const role = roles[idx];
    const { result, baseScore } = seatOutcome(role, winner);
    const total = baseScore + parseBonus(bonusScores[idx]);
    return { seat, idx, role, result, baseScore, total, isFirstKilled: firstKilled === seat.playerId };
  });

  const winnerText = winner === "draw" ? "Ничья" : `Победа: ${TEAM_NAMES[winner]?.toLowerCase()}`;

  return (
    <div className="space-y-5">
      <section className="card p-4 sm:p-5" aria-labelledby="scores-title">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-4">
          <h3 id="scores-title" className="font-semibold text-stone-50">Дополнительные баллы</h3>
          <p className="text-[13px] text-stone-500">
            {winnerText} · доп. балл от −5 до +5{trackFirstKill ? " · отметьте первоубиенного" : ""}
          </p>
        </div>

        {/* Телефон — карточки */}
        <ol className="sm:hidden space-y-2.5">
          {rows.map(({ seat, idx, role, result, baseScore, total, isFirstKilled }) => (
            <li key={idx} className={`rounded-xl border p-3 space-y-3 ${
              isFirstKilled ? "border-red-500/40 bg-red-500/5" : "border-line bg-elev-2/50"
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <SeatNumber seat={seat.seat} />
                <span className="text-sm font-medium text-stone-100 truncate flex-1">{getPlayerName(seat.playerId)}</span>
                <Badge variant={ROLE_BADGE_VARIANT[role]}>{ROLE_NAMES[role]}</Badge>
                {trackFirstKill && (
                  <FirstKillToggle compact active={isFirstKilled} seat={seat.seat}
                    onClick={() => onFirstKilledToggle(seat.playerId)} />
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[13px] ${RESULT_TONE[result]}`}>
                  {RESULT_NAMES[result]} · <span className="font-data">{baseScore}</span>
                </span>
                <BonusInput
                  value={bonusScores[idx]}
                  seat={seat.seat}
                  onChange={(v) => onBonusChange(idx, v)}
                  onToggleSign={() => onToggleSign(idx)}
                />
                <span className="text-sm text-stone-400">
                  = <span className="font-data font-semibold text-stone-50">{formatTotal(total)}</span>
                </span>
              </div>
              <input
                type="text"
                placeholder="За что доп. балл"
                aria-label={`Комментарий к доп. баллу, место ${seat.seat}`}
                value={bonusComments[idx]}
                onChange={(e) => onCommentChange(idx, e.target.value)}
                className="input input-sm"
              />
              {trackBestMove && isFirstKilled && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] text-red-300">Первоубиенный · лучший ход</span>
                  <div className="flex items-center gap-1.5">
                    <BestMoveSelects seatNumber={seat.seat} values={bestMoves} onChange={onBestMoveChange} />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>

        {/* Планшет и компьютер — таблица */}
        <div className="hidden sm:block overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[12px] text-stone-500 border-b border-line">
                <th scope="col" className="text-left font-medium px-1 pb-2">Место</th>
                <th scope="col" className="text-left font-medium px-2 pb-2">Игрок</th>
                <th scope="col" className="text-left font-medium px-2 pb-2">Результат</th>
                <th scope="col" className="text-center font-medium px-2 pb-2">База</th>
                <th scope="col" className="text-left font-medium px-2 pb-2">Доп.</th>
                <th scope="col" className="text-center font-medium px-2 pb-2">Итого</th>
                <th scope="col" className="text-left font-medium px-2 pb-2 w-[30%]">Комментарий</th>
                {trackFirstKill && <th scope="col" className="text-center font-medium px-2 pb-2" title="Первоубиенный">ПУ</th>}
                {showBestMoveColumn && <th scope="col" className="text-center font-medium px-2 pb-2" title="Лучший ход">ЛХ</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ seat, idx, role, result, baseScore, total, isFirstKilled }) => (
                <tr key={idx} className={`border-b border-line last:border-b-0 ${isFirstKilled ? "bg-red-500/8" : ""}`}>
                  <td className="px-1 py-1.5"><SeatNumber seat={seat.seat} /></td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-stone-100 truncate max-w-[10rem]">{getPlayerName(seat.playerId)}</span>
                      <Badge variant={ROLE_BADGE_VARIANT[role]}>{ROLE_NAMES[role]}</Badge>
                    </div>
                  </td>
                  <td className={`px-2 py-1.5 ${RESULT_TONE[result]}`}>{RESULT_NAMES[result]}</td>
                  <td className="px-2 py-1.5 text-center font-data text-stone-300">{baseScore}</td>
                  <td className="px-2 py-1.5">
                    <BonusInput
                      value={bonusScores[idx]}
                      seat={seat.seat}
                      onChange={(v) => onBonusChange(idx, v)}
                      onToggleSign={() => onToggleSign(idx)}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center font-data font-semibold text-stone-50">{formatTotal(total)}</td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={bonusComments[idx]}
                      onChange={(e) => onCommentChange(idx, e.target.value)}
                      aria-label={`Комментарий к доп. баллу, место ${seat.seat}`}
                      className="input input-sm"
                    />
                  </td>
                  {trackFirstKill && (
                    <td className="px-2 py-1.5 text-center">
                      <FirstKillToggle compact active={isFirstKilled} seat={seat.seat}
                        onClick={() => onFirstKilledToggle(seat.playerId)} />
                    </td>
                  )}
                  {showBestMoveColumn && (
                    <td className="px-2 py-1.5">
                      {isFirstKilled ? (
                        <div className="flex items-center gap-1 justify-center">
                          <BestMoveSelects seatNumber={seat.seat} values={bestMoves} onChange={onBestMoveChange} />
                        </div>
                      ) : (
                        <span className="block text-center text-stone-600">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <Field label="Комментарий к игре" optional hint="Виден на странице игры: спорные моменты, замены, решения судьи">
          <Textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={2} />
        </Field>
      </section>
    </div>
  );
}
