import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { EmptyState, Select, StatStrip } from "../components/ui";
import { useHashParam } from "../hooks/useHashParam";
import { ROLE_NAMES } from "../lib/constants";
import { formatDate, pluralize } from "../lib/utils";
import { clubOverview, monthlyActivity, teamBalanceBySeason, roleWinrates, mostActive, newcomers } from "../lib/clubStats";

const MONTHS_FULL = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const monthName = (key, full = false) => {
  const [y, m] = key.split("-");
  return full ? `${MONTHS_FULL[Number(m) - 1]} ${y}` : `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
};
const games_ = (n) => `${n} ${pluralize(n, "игра", "игры", "игр")}`;
const pct = (v) => `${Math.round(v)}%`;

function Card({ title, id, children, className = "" }) {
  return (
    <section className={`card p-4 md:p-5 ${className}`} aria-labelledby={id}>
      <h3 id={id} className="font-display text-base font-bold text-stone-50 mb-4">{title}</h3>
      {children}
    </section>
  );
}

// Игры по месяцам: столбцы одной серии, подсказка по наведению или касанию
function MonthlyChart({ rows }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(1, ...rows.map((r) => r.games));
  // Подписи месяцев — не чаще, чем помещается (примерно 8 на ширину)
  const every = Math.max(1, Math.ceil(rows.length / 8));
  const active = hovered == null ? null : rows[hovered];
  const ratio = hovered == null ? 0 : (hovered + 0.5) / rows.length;

  return (
    <div>
      <div className="relative h-40 flex gap-2">
        <div className="relative w-6 shrink-0 text-[11px] text-stone-500 font-data" aria-hidden="true">
          <span className="absolute right-0 top-0 -translate-y-1/2">{max}</span>
          <span className="absolute right-0 bottom-0 translate-y-1/2">0</span>
        </div>
        <div className="relative flex-1" onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(null)}>
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 border-t border-line" aria-hidden="true" />
          <div className="absolute inset-0 flex items-end gap-0.5" role="img"
            aria-label={`Игры по месяцам: с ${monthName(rows[0].month, true)} по ${monthName(rows.at(-1).month, true)}, больше всего — ${max} за месяц`}>
            {rows.map((r, i) => (
              // Зона наведения — во всю высоту колонки, а не только столбец
              <div key={r.month} className="relative h-full flex-1 flex items-end"
                onPointerEnter={() => setHovered(i)} onPointerDown={() => setHovered(i)}>
                <div
                  className={`w-full rounded-t ${i === hovered ? "bg-accent-300" : "bg-accent-500"}`}
                  style={{ height: r.games > 0 ? `max(${(r.games / max) * 100}%, 3px)` : 0 }}
                />
              </div>
            ))}
          </div>
          {active && (
            <div
              className="pointer-events-none absolute -top-2 z-10 whitespace-nowrap rounded-md border border-line-strong bg-surface-raised px-2 py-1 text-xs text-stone-300 shadow-lg"
              style={{ left: `${ratio * 100}%`, transform: `translate(${ratio < 0.2 ? 0 : ratio > 0.8 ? -100 : -50}%, -100%)` }}
            >
              <span className="font-semibold text-stone-100">{games_(active.games)}</span>
              <span className="ml-1.5 text-stone-500">
                {monthName(active.month, true)}
                {active.evenings > 0 && ` · ${active.evenings} ${pluralize(active.evenings, "вечер", "вечера", "вечеров")}`}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-1.5 ml-8 flex gap-0.5 text-[10px] text-stone-500" aria-hidden="true">
        {rows.map((r, i) => (
          <span key={r.month} className="flex-1 min-w-0 text-center whitespace-nowrap">
            {i % every === 0 ? monthName(r.month) : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Игры по месяцам</caption>
        <thead><tr><th>Месяц</th><th>Игр</th><th>Вечеров</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.month}><td>{monthName(r.month, true)}</td><td>{r.games}</td><td>{r.evenings}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

// Победы команд по сезонам — полоса «красные — ничьи — чёрные» на сезон
function TeamsBySeason({ rows }) {
  return (
    <div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400 mb-4" aria-label="Обозначения">
        <li className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" aria-hidden="true" />Красные</li>
        <li className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" aria-hidden="true" />Ничьи</li>
        <li className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-stone-500" aria-hidden="true" />Чёрные</li>
      </ul>
      <ul className="space-y-3">
        {rows.map((r) => {
          const red = (r.red / r.games) * 100;
          const draw = (r.draws / r.games) * 100;
          const black = Math.max(0, 100 - red - draw);
          return (
            <li key={r.seasonId}>
              <div className="flex items-baseline justify-between gap-3 text-sm mb-1.5">
                <span className="text-stone-200 truncate">{r.name}</span>
                <span className="text-xs text-stone-500 font-data whitespace-nowrap">{games_(r.games)}</span>
              </div>
              {/* без подложки: в зазоре между сегментами — фон карточки */}
              <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5" role="img"
                aria-label={`${r.name}: красные ${pct(red)}, чёрные ${pct(black)}${r.draws ? `, ничьи ${pct(draw)}` : ""}`}>
                {r.red > 0 && <div className="bg-red-500" style={{ width: `${red}%` }} />}
                {r.draws > 0 && <div className="bg-amber-400" style={{ width: `${draw}%` }} />}
                {r.black > 0 && <div className="bg-stone-500" style={{ width: `${black}%` }} />}
              </div>
              <div className="flex justify-between gap-3 text-xs text-stone-400 font-data mt-1">
                <span>{pct(red)} · {r.red}</span>
                {r.draws > 0 && <span className="text-stone-500">ничьи · {r.draws}</span>}
                <span>{r.black} · {pct(black)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Процент побед по ролям: одна мера — один цвет; черта — 50 %
function RoleBars({ rows }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.role} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-sm">
          <span className="text-stone-300">{ROLE_NAMES[r.role]}</span>
          <div className="relative h-2.5 rounded-full bg-elev-3" role="img"
            aria-label={`${ROLE_NAMES[r.role]}: побед ${pct(r.winrate)}, ${r.wins} из ${r.games}`}>
            <div className="h-full rounded-full bg-accent-500" style={{ width: `${r.winrate}%` }} />
            <div className="absolute -inset-y-[3px] left-1/2 w-px bg-stone-500" aria-hidden="true" />
          </div>
          <span className="font-data text-right whitespace-nowrap">
            <span className="text-stone-100 font-semibold">{pct(r.winrate)}</span>
            <span className="text-xs text-stone-500 ml-1.5">{r.wins}/{r.games}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function PlayerRows({ rows, navigate, value, empty }) {
  if (rows.length === 0) return <p className="text-sm text-stone-500">{empty}</p>;
  return (
    <ol className="space-y-0.5">
      {rows.map((r, i) => (
        <li key={r.id}>
          <button onClick={() => navigate("playerProfile", r.id)}
            className="flex items-center gap-3 w-full h-10 px-2 -mx-2 rounded-lg hover:bg-elev-2 text-left cursor-pointer">
            <span className="w-5 text-xs text-stone-500 font-data">{i + 1}</span>
            <span className="flex-1 min-w-0 truncate text-stone-100">{r.nickname}</span>
            <span className="text-xs text-stone-400 font-data whitespace-nowrap">{value(r)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export function ClubStats({ allGames, seasons, players, navigate }) {
  // Период — в адресе; по умолчанию за всё время: здесь важна история клуба
  const [period, setPeriod] = useHashParam("season", "all");
  const games = useMemo(
    () => (period === "all" ? allGames : allGames.filter((g) => g.seasonId === period)),
    [allGames, period]
  );

  const overview = useMemo(() => clubOverview(games), [games]);
  const monthly = useMemo(() => monthlyActivity(games), [games]);
  const teams = useMemo(() => teamBalanceBySeason(games, seasons), [games, seasons]);
  const roles = useMemo(() => roleWinrates(games), [games]);
  const active = useMemo(() => mostActive(games, players, 10), [games, players]);
  const fresh = useMemo(() => newcomers(games, allGames, players, 5), [games, allGames, players]);

  const periodName = period === "all" ? "За всё время" : seasons.find((s) => s.id === period)?.name ?? "Сезон";

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">{periodName}</p>
        <h2 className="page-title mt-1.5">Статистика клуба</h2>
      </header>

      <Select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Период"
        wrapperClassName="w-full sm:w-fit" className="sm:!w-auto sm:min-w-[9rem]">
        <option value="all">Все сезоны</option>
        {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>

      {games.length === 0 ? (
        <EmptyState icon={BarChart3} title="Игр за период нет" />
      ) : (
        <>
          <StatStrip items={[
            { label: "Игры", value: overview.games },
            { label: "Вечера", value: overview.evenings },
            { label: "Игроки", value: overview.players },
            { label: "Игр за вечер", value: overview.gamesPerEvening.toFixed(1).replace(".", ","), hint: "в среднем" },
          ]} />

          {monthly.length > 1 && (
            <Card title="Игры по месяцам" id="cs-month">
              <MonthlyChart rows={monthly} />
            </Card>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            {teams.length > 1 && (
              <Card title="Красные и чёрные по сезонам" id="cs-teams">
                <TeamsBySeason rows={teams} />
              </Card>
            )}
            <Card title="Победы по ролям" id="cs-roles">
              <RoleBars rows={roles} />
              <p className="text-xs text-stone-500 mt-4">По всем выходам в роли. Черта — 50%.</p>
            </Card>
            <Card title="Больше всего игр" id="cs-active">
              <PlayerRows rows={active} navigate={navigate} value={(r) => games_(r.games)} empty="—" />
            </Card>
            <Card title="Новички" id="cs-new">
              <PlayerRows rows={fresh} navigate={navigate} empty="Новых игроков за период нет"
                value={(r) => `с ${formatDate(r.firstDate)} · ${games_(r.games)}`} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
