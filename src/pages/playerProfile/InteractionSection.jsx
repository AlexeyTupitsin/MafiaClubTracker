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
export function InteractionSection({ pairs, history, navigate }) {
  const [pairsLimit, setPairsLimit] = useState(PAGE);
  const [gamesLimit, setGamesLimit] = useState(PAGE);

  return (
    <Section title="Взаимодействие" defaultOpen={true}>
      {pairs.length > 0 && (
        <div className="glass-card rounded-2xl p-4 mb-4">
          <h3 className="font-semibold mb-3">Статистика по парам</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-indigo-500/10">
                  <th className="text-left px-2 py-1.5 font-medium text-slate-400">Партнёр</th>
                  <th className="text-center px-2 py-1.5 font-medium text-slate-400">Игр</th>
                  <th className="text-center px-2 py-1.5 font-medium text-slate-400 whitespace-nowrap">Оба красн.</th>
                  <th className="text-center px-2 py-1.5 font-medium text-slate-400 whitespace-nowrap">Оба чёрн.</th>
                  <th className="text-center px-2 py-1.5 font-medium text-slate-400 whitespace-nowrap">Я кр. / Он чёр.</th>
                  <th className="text-center px-2 py-1.5 font-medium text-slate-400 whitespace-nowrap">Я чёр. / Он кр.</th>
                </tr>
              </thead>
              <tbody>
                {pairs.slice(0, pairsLimit).map((p) => (
                  <tr key={p.id} className="border-b border-indigo-500/10 last:border-b-0">
                    <td className="px-2 py-1.5">
                      <button onClick={() => navigate("playerProfile", p.id)}
                        className="text-indigo-400 hover:text-indigo-300 cursor-pointer">{p.nickname}</button>
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
              className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer">
              Показать ещё
            </button>
          )}
        </div>
      )}

      <div className="glass-card rounded-2xl p-4">
        <h3 className="font-semibold mb-3">История игр</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-indigo-500/10">
                <th className="text-left px-2 py-1.5 font-medium text-slate-400">Дата</th>
                <th className="text-left px-2 py-1.5 font-medium text-slate-400">Роль</th>
                <th className="text-left px-2 py-1.5 font-medium text-slate-400">Результат</th>
                <th className="text-center px-2 py-1.5 font-medium text-slate-400">База</th>
                <th className="text-center px-2 py-1.5 font-medium text-slate-400">Бонус</th>
                <th className="text-center px-2 py-1.5 font-medium text-slate-400">Итого</th>
                <th className="text-center px-2 py-1.5 font-medium text-slate-400">ELO</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, gamesLimit).map((h) => (
                <tr key={h.game.id} className="border-b border-indigo-500/10 last:border-b-0 hover:bg-indigo-500/5">
                  <td className="px-2 py-1.5 text-slate-400">
                    <button onClick={() => navigate("gameDetail", h.game.id)}
                      className="text-indigo-400 hover:text-indigo-300 cursor-pointer">
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
            className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer">
            Показать ещё
          </button>
        )}
      </div>
    </Section>
  );
}
