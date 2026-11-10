import { useMemo, useState } from "react";
import { AlertTriangle, GripVertical, History } from "lucide-react";
import { Button, PlayerSelect } from "../../components/ui";
import { SEAT_COUNT } from "./gameFormLogic";

export function SeatNumber({ seat, className = "" }) {
  return (
    <span className={`w-8 h-8 flex items-center justify-center rounded-full bg-elev-3 text-sm font-semibold text-stone-300 font-data shrink-0 ${className}`}>
      {seat}
    </span>
  );
}

// Отступ от края экрана, у которого список прокручивается во время перетаскивания
const AUTOSCROLL_EDGE = 60;

// Индекс строки места под указателем
function seatIndexAt(x, y) {
  const row = document.elementFromPoint(x, y)?.closest("[data-seat-idx]");
  return row ? Number(row.dataset.seatIdx) : null;
}

// Шаг 1: рассадка. onCopyLastGame — если задан, показывается кнопка «Как в прошлой игре».
// Игрока можно перетащить за ручку на другое место — игроки меняются местами (onSeatSwap).
// Pointer Events, а не HTML5 drag-and-drop: тот не работает на телефонах.
// showErrors — после попытки пройти дальше пустые места подсвечиваются.
export function SeatsStep({ seats, onSeatChange, onSeatSwap, activePlayers, onCopyLastGame, showErrors }) {
  const selectedIds = useMemo(() => seats.map((s) => s.playerId).filter(Boolean), [seats]);
  const filled = selectedIds.length;
  const [drag, setDrag] = useState(null); // { from, over }

  const startDrag = (e, idx) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ from: idx, over: idx });
  };

  const moveDrag = (e) => {
    if (!drag) return;
    if (e.clientY < AUTOSCROLL_EDGE) window.scrollBy(0, -10);
    else if (e.clientY > window.innerHeight - AUTOSCROLL_EDGE) window.scrollBy(0, 10);
    const over = seatIndexAt(e.clientX, e.clientY);
    if (over !== null && over !== drag.over) setDrag({ ...drag, over });
  };

  const endDrag = () => {
    if (drag && drag.over !== drag.from) onSeatSwap(drag.from, drag.over);
    setDrag(null);
  };

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="seats-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
        <div>
          <h3 id="seats-title" className="font-semibold text-stone-50">Кто за столом</h3>
          <p className="text-[13px] text-stone-500 mt-0.5">
            <span className={`font-data ${filled === SEAT_COUNT ? "text-accent-300" : "text-stone-300"}`}>{filled}</span> из {SEAT_COUNT} мест · порядок меняется перетаскиванием
          </p>
        </div>
        {onCopyLastGame && (
          <Button variant="secondary" size="sm" icon={History} onClick={onCopyLastGame}>
            Как в прошлой игре
          </Button>
        )}
      </div>

      <ol className="space-y-2">
        {seats.map((seat, idx) => (
          <li
            key={idx}
            data-seat-idx={idx}
            className={`flex items-center gap-2 rounded-xl transition-colors ${
              drag?.from === idx ? "opacity-50" : ""
            } ${drag && drag.over === idx && drag.from !== idx ? "bg-accent-400/12 ring-2 ring-accent-400/60" : ""}`}
          >
            <button
              type="button"
              aria-label={`Перетащить игрока с места ${seat.seat}`}
              title="Перетащить на другое место"
              disabled={!seat.playerId}
              onPointerDown={(e) => startDrag(e, idx)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={() => setDrag(null)}
              className="w-8 h-11 -mx-1 flex items-center justify-center text-stone-500 hover:text-stone-300 touch-none cursor-grab active:cursor-grabbing disabled:invisible"
            >
              <GripVertical size={18} />
            </button>
            <SeatNumber seat={seat.seat} />
            <PlayerSelect
              value={seat.playerId}
              onChange={(id) => onSeatChange(idx, id)}
              players={activePlayers}
              disabledIds={selectedIds.filter((id) => id !== seat.playerId)}
              ariaLabel={`Место ${seat.seat}`}
              placeholder="Ник игрока"
              invalid={showErrors && !seat.playerId}
            />
          </li>
        ))}
      </ol>

      {activePlayers.length < SEAT_COUNT && (
        <p className="mt-4 text-sm text-amber-300 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          В составе {activePlayers.length} активных игроков, а за столом нужно {SEAT_COUNT}. Добавьте игроков на странице «Игроки».
        </p>
      )}
    </section>
  );
}
