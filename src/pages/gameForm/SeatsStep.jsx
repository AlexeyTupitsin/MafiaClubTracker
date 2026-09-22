import { useMemo } from "react";
import { AlertTriangle, Users } from "lucide-react";
import { PlayerSelect } from "../../components/ui";
import { SEAT_COUNT } from "./gameFormLogic";

export function SeatNumber({ seat }) {
  return (
    <span className="w-8 h-8 flex items-center justify-center bg-slate-800/30 rounded-full text-sm font-medium text-slate-400 shrink-0">
      {seat}
    </span>
  );
}

// Шаг 1: рассадка. onCopyLastGame — если задан, показывается кнопка «Из предыдущей игры»
export function SeatsStep({ seats, onSeatChange, activePlayers, onCopyLastGame }) {
  const selectedIds = useMemo(() => seats.map((s) => s.playerId).filter(Boolean), [seats]);

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Выберите 10 игроков</h3>
        {onCopyLastGame && (
          <button
            onClick={onCopyLastGame}
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium"
          >
            <Users size={14} /> Из предыдущей игры
          </button>
        )}
      </div>
      <div className="space-y-2">
        {seats.map((seat, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <SeatNumber seat={seat.seat} />
            <PlayerSelect
              value={seat.playerId}
              onChange={(id) => onSeatChange(idx, id)}
              players={activePlayers}
              disabledIds={selectedIds.filter((id) => id !== seat.playerId)}
            />
          </div>
        ))}
      </div>
      {activePlayers.length < SEAT_COUNT && (
        <p className="mt-3 text-sm text-amber-600 flex items-center gap-1">
          <AlertTriangle size={14} />
          Нужно минимум 10 активных игроков (сейчас {activePlayers.length})
        </p>
      )}
    </div>
  );
}
