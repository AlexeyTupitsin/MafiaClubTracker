import { Scale, Shield, Sword } from "lucide-react";
import { Badge } from "../../components/ui";
import { ROLE_NAMES, ROLE_OPTIONS, ROLE_REQUIRED, ROLE_BADGE_VARIANT } from "../../lib/constants";
import { SEAT_COUNT, countRoles, fillRandomRoles } from "./gameFormLogic";
import { SeatNumber } from "./SeatsStep";

const WINNERS = [
  {
    value: "red", label: "Красные", icon: Shield,
    active: "border-red-500 bg-red-500/10 text-red-400 shadow-sm",
    idle: "hover:border-red-500/30 hover:bg-red-500/5",
  },
  {
    value: "draw", label: "Ничья", icon: Scale,
    active: "border-amber-500 bg-amber-500/10 text-amber-400 shadow-sm",
    idle: "hover:border-amber-500/30 hover:bg-amber-500/5",
  },
  {
    value: "black", label: "Чёрные", icon: Sword,
    active: "border-slate-500 bg-slate-700 text-slate-200 shadow-sm",
    idle: "hover:border-slate-500 hover:bg-indigo-500/5",
  },
];

const secondaryButton = "px-3 py-1.5 bg-slate-800/30 hover:bg-indigo-500/5 text-slate-300 rounded-lg text-sm transition-colors";

function RoleCounters({ roles }) {
  const counts = countRoles(roles);
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {ROLE_OPTIONS.map(({ value, label }) => {
        const count = counts[value];
        const required = ROLE_REQUIRED[value];
        const ok = count === required;
        const over = count > required;
        return (
          <div key={value}
            className={`px-3 py-1 rounded-full text-sm font-medium border ${
              over
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : ok
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                : "bg-slate-800/30 border-indigo-500/15 text-slate-400"
            }`}
          >
            {label}: {count}/{required} {ok ? "✓" : over ? "✗" : ""}
          </div>
        );
      })}
    </div>
  );
}

function WinnerPicker({ winner, onChange }) {
  return (
    <div>
      <h4 className="font-medium mb-2">Победитель</h4>
      <div className="grid grid-cols-3 gap-3">
        {WINNERS.map(({ value, label, icon: Icon, active, idle }) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 text-sm font-semibold transition-all ${
              winner === value ? active : `border-indigo-500/15 text-slate-500 ${idle}`
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Шаг 2: роли и победитель
export function RolesStep({ seats, roles, onRoleChange, onRolesChange, winner, onWinnerChange, getPlayerName }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <RoleCounters roles={roles} />

      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => onRolesChange(fillRandomRoles(roles))} className={secondaryButton}>
          Заполнить случайно
        </button>
        <button type="button" onClick={() => onRolesChange(Array(SEAT_COUNT).fill(""))} className={secondaryButton}>
          Очистить роли
        </button>
      </div>

      <div className="space-y-2 mb-6">
        {seats.map((seat, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <SeatNumber seat={seat.seat} />
            <span className="w-24 text-sm font-medium truncate">{getPlayerName(seat.playerId)}</span>
            <select
              value={roles[idx]}
              onChange={(e) => onRoleChange(idx, e.target.value)}
              className={`flex-1 bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                !roles[idx] ? "text-slate-500" : ""
              }`}
            >
              <option value="">Роль...</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {roles[idx] && (
              <Badge variant={ROLE_BADGE_VARIANT[roles[idx]]}>
                {ROLE_NAMES[roles[idx]]}
              </Badge>
            )}
          </div>
        ))}
      </div>

      <WinnerPicker winner={winner} onChange={onWinnerChange} />
    </div>
  );
}
