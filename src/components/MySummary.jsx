import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, UserRound, X } from "lucide-react";
import { PlayerAvatar } from "./ui";
import { eveningSummary } from "../lib/standings";
import { formatDate, pluralize } from "../lib/utils";

const fmtScore = (v) => (v % 1 === 0 ? String(v) : v.toFixed(1));
const fmtGap = (v) => Math.abs(v).toFixed(2);
const HINT_KEY = "ironmaf:me-hint-hidden";

function readHintHidden() {
  try { return window.localStorage.getItem(HINT_KEY) === "1"; } catch { return false; }
}

// Подсказка для тех, кто ещё не отметил себя: где взять «Это я»
export function MeHint({ navigate }) {
  const [hidden, setHidden] = useState(readHintHidden);
  if (hidden) return null;
  const hide = () => {
    try { window.localStorage.setItem(HINT_KEY, "1"); } catch { /* не сохранится — не страшно */ }
    setHidden(true);
  };
  return (
    <div className="card flex items-center gap-3 px-4 py-3 text-sm">
      <UserRound size={18} className="shrink-0 text-accent-400" aria-hidden="true" />
      <p className="flex-1 text-stone-400">
        Найдите себя в{" "}
        <button onClick={() => navigate("players")} className="text-accent-300 hover:text-accent-200 font-medium cursor-pointer">списке игроков</button>
        {" "}и нажмите «Это я» — здесь появятся ваше место и итоги вечера.
      </p>
      <button onClick={hide} aria-label="Скрыть подсказку"
        className="shrink-0 w-9 h-9 -mr-2 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-200 hover:bg-elev-2 cursor-pointer">
        <X size={16} />
      </button>
    </div>
  );
}

function PlaceDelta({ place, prevPlace, firstEvening }) {
  if (place == null) return null;
  if (firstEvening) return <span className="text-sm text-stone-500">первый вечер сезона</span>;
  // до этого вечера места не было (ниже порога или не играл) — сравнивать не с чем
  if (prevPlace == null) return null;
  const diff = prevPlace - place;
  if (diff === 0) return <span className="text-sm text-stone-500">без изменений</span>;
  const up = diff > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-semibold font-data ${up ? "text-emerald-400" : "text-red-400"}`}>
      <Icon size={14} aria-hidden="true" />
      <span className="sr-only">{up ? "поднялись на" : "опустились на"} </span>
      {Math.abs(diff)}
    </span>
  );
}

function Neighbour({ label, row, players, navigate, sign }) {
  if (!row) return null;
  const nickname = players.find((p) => p.id === row.id)?.nickname ?? "?";
  return (
    <button onClick={() => navigate("playerProfile", row.id)}
      className="flex items-center gap-2 w-full min-w-0 h-10 px-2 -mx-2 rounded-lg hover:bg-elev-2 text-left cursor-pointer">
      <span className="text-xs text-stone-500 w-10 shrink-0">{label}</span>
      <span className="truncate text-stone-100">{nickname}</span>
      <span className="ml-auto pl-2 text-xs text-stone-500 font-data whitespace-nowrap" title="Разница среднего балла">
        {sign}{fmtGap(row.gap)}
      </span>
    </button>
  );
}

// Сводка «Это я» на дашборде: место сейчас и как изменилось за последний вечер,
// игры вечера, соседи по рейтингу
export function MySummary({ meId, players, games, season, navigate }) {
  const me = players.find((p) => p.id === meId);
  const s = useMemo(() => (me ? eveningSummary(me.id, games, season) : null), [me, games, season]);
  if (!me || !s) return null;

  const eveningDate = formatDate(s.date);

  return (
    <section className="card p-4 md:p-5 shadow-[inset_3px_0_0_var(--color-accent-400)]" aria-labelledby="me-title">
      <button onClick={() => navigate("playerProfile", me.id)} className="flex items-center gap-2.5 min-w-0 mb-4 text-left cursor-pointer group">
        <PlayerAvatar player={me} size="xs" clickable={false} />
        <span id="me-title" className="eyebrow">Ваш сезон</span>
        <span className="font-medium text-stone-100 truncate group-hover:text-accent-200">{me.nickname}</span>
      </button>

      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr]">
        {/* Место */}
        <div className="min-w-0">
          {s.place != null ? (
            <>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-display text-3xl font-bold text-stone-50 font-data leading-none">{s.place}</span>
                <span className="text-sm text-stone-400">место из {s.rankedCount}</span>
                <PlaceDelta place={s.place} prevPlace={s.prevPlace} firstEvening={s.firstEvening} />
              </div>
              <p className="text-xs text-stone-500 mt-1.5">ср. балл {s.me.avgScore.toFixed(2)}</p>
            </>
          ) : s.me ? (
            <>
              <p className="text-stone-200 font-medium">Пока вне рейтинга</p>
              <p className="text-xs text-stone-500 mt-1">
                Сыграно {s.me.games} из {s.threshold} нужных — ещё{" "}
                {s.gamesToThreshold} {pluralize(s.gamesToThreshold, "игра", "игры", "игр")}
              </p>
            </>
          ) : (
            <p className="text-stone-400">В этом сезоне вы ещё не играли</p>
          )}
        </div>

        {/* Последний вечер */}
        {s.me && (
          <div className="min-w-0">
            <p className="text-xs text-stone-500 mb-1">Вечер {eveningDate}</p>
            {s.evening ? (
              <p className="text-sm text-stone-200 font-data">
                {s.evening.games} {pluralize(s.evening.games, "игра", "игры", "игр")}
                {" · "}{s.evening.wins} {pluralize(s.evening.wins, "победа", "победы", "побед")}
                {" · "}{fmtScore(s.evening.score)} б.
                {s.evening.eloDelta != null && Math.round(s.evening.eloDelta) !== 0 && (
                  <span className={s.evening.eloDelta > 0 ? "text-emerald-400" : "text-red-400"}>
                    {" · ELO "}{s.evening.eloDelta > 0 ? "+" : "−"}{Math.abs(Math.round(s.evening.eloDelta))}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-stone-400">Вы не играли</p>
            )}
          </div>
        )}

        {/* Соседи по рейтингу: на сколько выше их средний балл / ниже */}
        {(s.above || s.below) && (
          <div className="min-w-0 sm:col-span-2 xl:col-span-1">
            <p className="text-xs text-stone-500 mb-0.5">Соседи по рейтингу</p>
            <Neighbour label="Выше" row={s.above} players={players} navigate={navigate} sign="+" />
            <Neighbour label="Ниже" row={s.below} players={players} navigate={navigate} sign="−" />
          </div>
        )}
      </div>
    </section>
  );
}
