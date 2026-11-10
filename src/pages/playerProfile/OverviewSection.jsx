import { StatStrip } from "../../components/ui";
import { formatDate } from "../../lib/utils";
import { Section } from "./Section";
import { fmtScore, fmtWr } from "./profileLogic";

// Обзор: выбор периода, карточки с цифрами, последние турниры
export function OverviewSection({ periodSelect, stats, eloSummary, killRateData, tournamentStats }) {
  return (
    <Section title="Обзор" defaultOpen={true}>
      {periodSelect}

      <StatStrip className="mb-4" items={[
        ...(eloSummary ? [{
          label: "ELO",
          value: eloSummary.current,
          hint: eloSummary.recentDelta !== 0
            ? <span className={eloSummary.recentDelta > 0 ? "text-emerald-400" : "text-red-400"}>
                {eloSummary.recentDelta > 0 ? "+" : "−"}{Math.abs(eloSummary.recentDelta)} за 10 игр
              </span>
            : "без изменений",
        }] : []),
        { label: "Игры", value: stats.totalGames,
          hint: `${stats.wins}–${stats.losses}${stats.draws > 0 ? `–${stats.draws}` : ""}` },
        { label: "Победы", value: <span className={stats.winrate > 60 ? "text-emerald-400" : stats.winrate < 40 ? "text-red-400" : ""}>{fmtWr(stats.winrate)}</span> },
        { label: "Ср. балл", value: <span className="text-accent-300">{stats.avgScore.toFixed(2)}</span>, hint: `${fmtScore(stats.totalScore)} всего` },
        { label: "Ср. доп.", value: <span className={stats.avgBonus > 0 ? "text-emerald-400" : stats.avgBonus < 0 ? "text-red-400" : ""}>{stats.avgBonus > 0 ? "+" : ""}{stats.avgBonus.toFixed(2)}</span> },
        ...(killRateData ? [{
          label: "Первым убит",
          value: `${killRateData.killRate.toFixed(0)}%`,
          hint: `${killRateData.timesKilled} из ${killRateData.gamesTracked}`,
        }] : []),
      ]} />

      {tournamentStats.length > 0 && (
        <div className="card p-4">
          <h4 className="text-sm font-semibold text-stone-200 mb-2">Последние турниры</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-2 py-1.5 font-medium text-stone-400">Турнир</th>
                  <th className="text-left px-2 py-1.5 font-medium text-stone-400">Дата</th>
                  <th className="text-center px-2 py-1.5 font-medium text-stone-400">Игр</th>
                  <th className="text-center px-2 py-1.5 font-medium text-stone-400">Побед</th>
                  <th className="text-center px-2 py-1.5 font-medium text-stone-400">WR%</th>
                  <th className="text-center px-2 py-1.5 font-medium text-stone-400">Баллы</th>
                  <th className="text-center px-2 py-1.5 font-medium text-stone-400">Ср. балл</th>
                </tr>
              </thead>
              <tbody>
                {tournamentStats.map((t) => (
                  <tr key={t.id} className="border-b border-line last:border-b-0">
                    <td className="px-2 py-1.5 font-medium">{t.name}</td>
                    <td className="px-2 py-1.5 text-stone-400">{formatDate(t.date)}</td>
                    <td className="px-2 py-1.5 text-center">{t.games}</td>
                    <td className="px-2 py-1.5 text-center">{t.wins}</td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={t.winrate > 60 ? "text-emerald-400 font-medium" : t.winrate < 40 ? "text-red-400" : ""}>
                        {t.winrate.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center font-semibold">{fmtScore(t.totalScore)}</td>
                    <td className="px-2 py-1.5 text-center">{t.avgScore.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Section>
  );
}
