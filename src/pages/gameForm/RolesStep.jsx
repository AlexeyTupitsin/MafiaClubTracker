import { Check, Eraser, Scale, Shield, Shuffle, Sword, Users } from "lucide-react";
import { Button, Segmented } from "../../components/ui";
import { ROLE_OPTIONS, ROLE_REQUIRED } from "../../lib/constants";
import { SEAT_COUNT, countRoles, fillRandomRoles, missingRoles } from "./gameFormLogic";
import { SeatNumber } from "./SeatsStep";

// Выбранная роль окрашивается цветом команды: красные — красный и жёлтый, чёрные — графит
const ROLE_ACTIVE = {
  citizen: "!bg-red-500/15 !text-red-300 ring-1 ring-inset ring-red-500/40 !shadow-none",
  sheriff: "!bg-yellow-400/12 !text-yellow-200 ring-1 ring-inset ring-yellow-400/40 !shadow-none",
  mafia: "!bg-stone-700/70 !text-stone-100 ring-1 ring-inset ring-stone-400/40 !shadow-none",
  don: "!bg-stone-950 !text-stone-50 ring-1 ring-inset ring-stone-300/60 !shadow-none",
};

const WINNER_OPTIONS = [
  {
    value: "red", label: "Красные", icon: Shield,
    className: "!min-h-[52px] !text-[15px] !font-semibold",
    activeClassName: "!bg-red-500/15 !text-red-300 ring-1 ring-inset ring-red-500/45 !shadow-none",
  },
  {
    value: "black", label: "Чёрные", icon: Sword,
    className: "!min-h-[52px] !text-[15px] !font-semibold",
    activeClassName: "!bg-stone-950 !text-stone-50 ring-1 ring-inset ring-stone-300/50 !shadow-none",
  },
  {
    value: "draw", label: "Ничья", icon: Scale,
    className: "!min-h-[52px] !text-[15px] !font-semibold",
  },
];

const ROLE_PLURAL = { citizen: "Мирные", sheriff: "Шериф", mafia: "Мафия", don: "Дон" };

function RoleCounters({ roles }) {
  const counts = countRoles(roles);
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Роздано ролей">
      {ROLE_OPTIONS.map(({ value }) => {
        const count = counts[value];
        const required = ROLE_REQUIRED[value];
        const ok = count === required;
        const over = count > required;
        return (
          <li key={value}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-medium border ${
              over
                ? "bg-red-500/10 border-red-500/35 text-red-300"
                : ok
                ? "bg-accent-400/8 border-accent-400/30 text-accent-200"
                : "bg-elev-2 border-line text-stone-400"
            }`}
          >
            {ok && <Check size={13} aria-hidden="true" />}
            {ROLE_PLURAL[value]}
            <span className="font-data">{count}/{required}</span>
          </li>
        );
      })}
    </ul>
  );
}

// Шаг 2: роли и победитель. showErrors — после попытки пройти дальше пустое отмечается.
export function RolesStep({ seats, roles, onRoleChange, onRolesChange, winner, onWinnerChange, getPlayerName, showErrors }) {
  const counts = countRoles(roles);
  const missing = missingRoles(roles);
  const emptyCount = roles.filter((r) => !r).length;
  const onlyCitizensLeft = emptyCount > 0 && missing.citizen === emptyCount
    && missing.sheriff + missing.mafia + missing.don === 0;

  return (
    <div className="space-y-5">
      <section className="card p-4 sm:p-5" aria-labelledby="roles-title">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 id="roles-title" className="font-semibold text-stone-50">Роли</h3>
            <p className="text-[13px] text-stone-500 mt-0.5">6 мирных, шериф, 2 мафии и дон</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {onlyCitizensLeft ? (
              <Button size="sm" icon={Users} onClick={() => onRolesChange(fillRandomRoles(roles))}>
                Остальные — мирные
              </Button>
            ) : emptyCount > 0 ? (
              <Button variant="ghost" size="sm" icon={Shuffle} onClick={() => onRolesChange(fillRandomRoles(roles))}>
                Раздать случайно
              </Button>
            ) : null}
            {emptyCount < SEAT_COUNT && (
              <Button variant="ghost" size="sm" icon={Eraser} onClick={() => onRolesChange(Array(SEAT_COUNT).fill(""))}>
                Очистить
              </Button>
            )}
          </div>
        </div>

        <RoleCounters roles={roles} />

        <ol className="mt-4 divide-y divide-line">
          {seats.map((seat, idx) => {
            const name = getPlayerName(seat.playerId);
            const options = ROLE_OPTIONS.map((r) => ({
              value: r.value,
              label: r.label,
              activeClassName: ROLE_ACTIVE[r.value],
              // Роль уже роздана полностью — вариант приглушён, но выбрать можно
              className: roles[idx] !== r.value && counts[r.value] >= ROLE_REQUIRED[r.value] ? "opacity-40" : "",
            }));
            return (
              <li key={idx} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-3 sm:w-48 min-w-0">
                  <SeatNumber seat={seat.seat} />
                  <span className="text-sm font-medium text-stone-100 truncate">{name}</span>
                </div>
                <Segmented
                  label={`Роль: место ${seat.seat}, ${name}`}
                  value={roles[idx]}
                  onChange={(role) => onRoleChange(idx, roles[idx] === role ? "" : role)}
                  options={options}
                  invalid={showErrors && !roles[idx]}
                  className="flex-1 sm:max-w-md"
                  size="sm"
                />
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card p-4 sm:p-5" aria-labelledby="winner-title">
        <h3 id="winner-title" className="font-semibold text-stone-50 mb-3">Кто победил</h3>
        <Segmented
          label="Победитель"
          value={winner}
          onChange={onWinnerChange}
          options={WINNER_OPTIONS}
          invalid={showErrors && !winner}
        />
      </section>
    </div>
  );
}
