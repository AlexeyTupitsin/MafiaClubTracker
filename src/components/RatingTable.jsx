import { ChevronDown, ChevronUp } from "lucide-react";
import { PlayerAvatar } from "./ui";
import { useMe } from "../hooks/useMe";

// Таблица рейтинга: дашборд и страница «Рейтинг».
// «#» и «Игрок» закреплены слева — на телефоне прокручиваются только цифры.
// Сортировка — кнопки в заголовках (клавиатура, aria-sort).
// stickyHeader: таблица прокручивается внутри карточки (не выше экрана),
// и шапка с названиями столбцов остаётся видна. Через прокрутку страницы
// так не выйдет: горизонтальная прокрутка на телефоне ломает sticky.
// Строка игрока, отметившего себя «Это я», подсвечена.
//
// columns: [{ key, label, title?, sortable?, render?(row), strong? }]
// rows: [{ id, nickname, avatarUrl?, ... }]

const RANK_STYLE = [
  "bg-accent-400 text-accent-950",   // 1 — латунь
  "bg-stone-300 text-stone-900",     // 2 — серебро
  "bg-accent-800 text-accent-100",   // 3 — бронза
];

export function RankMark({ idx }) {
  if (idx < 3) {
    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-data ${RANK_STYLE[idx]}`}>
        {idx + 1}
      </span>
    );
  }
  return <span className="inline-flex justify-center w-6 text-stone-500 font-data">{idx + 1}</span>;
}

// Линии таблицы рисуются у ячеек (border-separate): у sticky-ячеек
// border строки при прокрутке «отклеивается»
const HEAD_LINE = "shadow-[inset_0_-1px_0_var(--color-line)]";

const sortIcon = (dir) => (dir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />);
const ariaSortOf = (active, dir) => (active ? (dir === "asc" ? "ascending" : "descending") : "none");

function SortHeader({ col, sortCol, sortDir, onSort }) {
  const active = sortCol === col.key;
  if (!col.sortable) {
    return (
      <th scope="col" className={`sticky top-0 z-10 bg-elev-1 px-3 h-10 text-right font-medium text-stone-500 whitespace-nowrap ${HEAD_LINE}`} title={col.title}>
        {col.label}
      </th>
    );
  }
  return (
    <th scope="col" aria-sort={ariaSortOf(active, sortDir)} className={`sticky top-0 z-10 bg-elev-1 p-0 text-right whitespace-nowrap ${HEAD_LINE}`}>
      <button
        type="button"
        onClick={() => onSort(col.key)}
        title={col.title}
        className={`inline-flex items-center justify-end gap-0.5 w-full h-10 px-3 font-medium cursor-pointer ${
          active ? "text-accent-300" : "text-stone-500 hover:text-stone-200"
        }`}
      >
        {col.label}
        {active ? sortIcon(sortDir) : <span className="w-[13px]" aria-hidden="true" />}
      </button>
    </th>
  );
}

const STICKY_EDGE = "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-line md:after:hidden";

export function RatingTable({ rows, columns, sortCol, sortDir, onSort, navigate, stickyHeader = false }) {
  const [meId] = useMe();
  const dataCols = columns.filter((c) => c.key !== "nickname");
  const nickActive = sortCol === "nickname";

  return (
    <div className={`overflow-x-auto overscroll-x-contain ${stickyHeader ? "max-h-[calc(100dvh-9.5rem)] md:max-h-[calc(100dvh-5rem)]" : ""}`}>
      <table className="w-full text-sm font-data border-separate border-spacing-0">
        <thead>
          <tr>
            <th scope="col" className={`sticky left-0 top-0 z-20 bg-elev-1 w-12 min-w-12 px-3 h-10 text-center font-medium text-stone-500 ${HEAD_LINE}`}>#</th>
            <th scope="col" aria-sort={ariaSortOf(nickActive, sortDir)} className={`sticky left-12 top-0 z-20 bg-elev-1 p-0 text-left ${HEAD_LINE} ${STICKY_EDGE}`}>
              <button type="button" onClick={() => onSort("nickname")}
                className={`inline-flex items-center gap-0.5 h-10 px-3 font-medium cursor-pointer ${nickActive ? "text-accent-300" : "text-stone-500 hover:text-stone-200"}`}>
                Игрок
                {nickActive && sortIcon(sortDir)}
              </button>
            </th>
            {dataCols.map((col) => (
              <SortHeader key={col.key} col={col} sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isMe = row.id === meId;
            // Подсветка «я» — непрозрачный токен: под закреплёнными ячейками не должно просвечивать
            const bg = isMe ? "bg-me" : "bg-elev-1";
            const cell = `border-b border-line group-last:border-b-0 group-hover:bg-elev-2 ${bg}`;
            return (
            <tr key={row.id} className="group" aria-current={isMe ? "true" : undefined}>
              <td className={`sticky left-0 z-10 px-3 py-2 text-center ${cell} ${isMe ? "shadow-[inset_3px_0_0_var(--color-accent-400)]" : ""}`}>
                <RankMark idx={idx} />
              </td>
              <td className={`sticky left-12 z-10 px-3 py-2 ${cell} ${STICKY_EDGE}`}>
                <button
                  onClick={() => navigate("playerProfile", row.id)}
                  className="flex items-center gap-2.5 min-h-8 max-w-[140px] sm:max-w-[240px] text-left font-sans font-medium text-stone-100 hover:text-accent-300 cursor-pointer"
                >
                  <span className="hidden sm:block"><PlayerAvatar player={row} size="xs" clickable={false} /></span>
                  <span className="truncate">{row.nickname}</span>
                  {isMe && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-accent-300">вы</span>}
                </button>
              </td>
              {dataCols.map((col) => (
                <td key={col.key}
                  className={`px-3 py-2 text-right whitespace-nowrap ${cell} ${
                    col.key === sortCol ? "text-stone-50 font-semibold" : "text-stone-300"
                  }`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
