import { useState } from "react";
import { Badge } from "../../components/ui";
import { EloCell } from "../../components/EloCell";
import { ROLE_NAMES, ROLE_BADGE_VARIANT, RESULT_NAMES } from "../../lib/constants";
import { formatDate } from "../../lib/utils";
import { Section } from "./Section";
import { fmtScore, fmtPairCell } from "./profileLogic";

const PAGE = 10;

// Взаимодействие: статистика по парам и история игр.
// Счётчики «Показать ещё» живут здесь, вне сворачиваемой части — при
// сворачивании секции не сбрасываются.
// Один столбец карточки: лучшие партнёры или неудобные соперники
function HighlightList({ title, hint, rows, tone, empty, navigate }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-stone-200">{title}</h4>
      <p className="text-xs text-stone-500 mb-2">{hint}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-stone-500 py-2">{empty}</p>
      ) : (
        <ol className="space-y-1">
          {rows.map((r, i) => (
            <li key={r.id}>
              <button
                onClick={() => navigate("playerProfile", r.id)}
                className="flex items-center gap-3 w-full min-h-10 px-2 -mx-2 rounded-lg hover:bg-elev-2 text-left cursor-pointer"
              >
                <span className="w-4 text-xs text-stone-500 font-data">{i + 1}</span>
                <span className="flex-1 min-w-0 truncate text-stone-100">{r.nickname}</span>
                <span className="text-xs text-stone-500 font-data whitespace-nowrap">{r.wins} из {r.games}</span>
                <span className={`w-11 text-right text-sm font-semibold font-data ${tone}`}>{r.winrate.toFixed(0)}%</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PartnersCard({ highlights, navigate }) {
  const { partners, rivals, minGames } = highlights;
  const empty = `Нужно хотя бы ${minGames} общих игр`;
  return (
    <div className="card rounded-2xl p-4 mb-4 grid gap-5 sm:grid-cols-2">
      <HighlightList
        title="Лучшие партнёры"
        hint="Чаще всего побеждает в одной команде с ними"
        rows={partners} tone="text-emerald-400" empty={empty} navigate={navigate}
      />
      <HighlightList
        title="Неудобные соперники"
        hint="Реже всего побеждает, играя против них"
        rows={rivals} tone="text-red-400" empty={empty} navigate={navigate}
      />
    </div>
  );
}

export function InteractionSection({ pairs, highlights, history, navigate }) {
  const [pairsLimit, setPairsLimit] = useState(PAGE);
  const [gamesLimit, setGamesLimit] = useState(PAGE);

  return (
    <Section title="Взаимодействие" defaultOpen={true}>
      {pairs.length > 0 && <PartnersCard highlights={highlights} navigate={navigate} />}

      {pairs.length > 0 && (
        <div className="card rounded-2xl p-4 mb-4">
          <h3 className="font-semibold mb-3">Статистика по парам</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-2 py-1.5 font-medium text-stone-400">Партнёр</th>
                  <th className="text-center px-2 py-1.5 font-medium text-stone-400">Игр</th>
                  <th className="text-center px-2 py-1.5 font-medium text-stone-400 whitespace-nowrap">Оба красн.</th>
                  <th className="text-center px-2 py-1.5 font-medium text-stone-400 whitespace-nowrap">Оба чёрн.</th>
                  <th className="text-center px-2 py-1.5 font-medium text-stone-400 whitespace-nowrap">Я кр. / Он чёр.</th>
                  <th className="text-center px-2 py-1.5 font-medium text-stone-400 whitespace-nowrap">Я чёр. / Он кр.</th>
                </tr>
              </thead>
              <tbody>
                {pairs.slice(0, pairsLimit).map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-b-0">
                    <td className="px-2 py-1.5">
                      <button onClick={() => navigate("playerProfile", p.id)}
                        className="text-stone-100 hover:text-accent-300 cursor-pointer">{p.nickname}</button>
                    </td>
                    <td className="px-2 py-1.5 text-center font-medium">{p.totalGames}</td>
                    <td className="px-2 py-1.5 text-center text-xs">
                      {fmtPairCell(p.bothRed.games, p.bothRed.wins, p.bothRed.winrate)}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs">
                      {fmtPairCell(p.bothBlack.games, p.bothBlack.wins, p.bothBlack.winrate)}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs">
                      {fmtPairCell(p.aRedBBlack.games, p.aRedBBlack.winsA, p.aRedBBlack.winrateA)}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs">
                      {fmtPairCell(p.aBlackBRed.games, p.aBlackBRed.winsA, p.aBlackBRed.winrateA)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pairs.length > pairsLimit && (
            <button onClick={() => setPairsLimit((n) => n + PAGE)}
              className="mt-3 text-sm text-accent-400 hover:text-accent-300 cursor-pointer">
              Показать ещё
            </button>
          )}
        </div>
      )}

      <div className="card rounded-2xl p-4">
        <h3 className="font-semibold mb-3">История игр</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left px-2 py-1.5 font-medium text-stone-400">Дата</th>
                <th className="text-left px-2 py-1.5 font-medium text-stone-400">Роль</th>
                <th className="text-left px-2 py-1.5 font-medium text-stone-400">Результат</th>
                <th className="text-center px-2 py-1.5 font-medium text-stone-400">База</th>
                <th className="text-center px-2 py-1.5 font-medium text-stone-400">Бонус</th>
                <th className="text-center px-2 py-1.5 font-medium text-stone-400">Итого</th>
                <th className="text-center px-2 py-1.5 font-medium text-stone-400">ELO</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, gamesLimit).map((h) => (
                <tr key={h.game.id} className="border-b border-line last:border-b-0 hover:bg-white/[0.04]">
                  <td className="px-2 py-1.5 text-stone-400">
                    <button onClick={() => navigate("gameDetail", h.game.id)}
                      className="text-stone-100 hover:text-accent-300 cursor-pointer">
                      {formatDate(h.game.date)}
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge variant={ROLE_BADGE_VARIANT[h.role]}>{ROLE_NAMES[h.role]}</Badge>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={
                      h.result === "win" ? "text-emerald-400 font-medium" :
                      h.result === "draw" ? "text-amber-400 font-medium" :
                      "text-red-400"
                    }>
                      {RESULT_NAMES[h.result]}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">{h.baseScore}</td>
                  <td className="px-2 py-1.5 text-center">
                    {h.bonusScore !== 0 && (
                      <span className={h.bonusScore > 0 ? "text-emerald-400" : "text-red-400"}>
                        {h.bonusScore > 0 ? "+" : ""}{fmtScore(h.bonusScore)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center font-semibold">{fmtScore(h.totalScore)}</td>
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    <EloCell game={h.game} gp={h} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {history.length > gamesLimit && (
          <button onClick={() => setGamesLimit((n) => n + PAGE)}
            className="mt-3 text-sm text-accent-400 hover:text-accent-300 cursor-pointer">
            Показать ещё
          </button>
        )}
      </div>
    </Section>
  );
}
