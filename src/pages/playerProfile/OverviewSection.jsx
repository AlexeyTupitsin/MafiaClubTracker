import { StatCard } from "../../components/ui";
import { formatDate } from "../../lib/utils";
import { Section } from "./Section";
import { fmtScore, fmtWr } from "./profileLogic";

// Обзор: выбор периода, карточки с цифрами, последние турниры
export function OverviewSection({ periodSelect, stats, eloSummary, killRateData, tournamentStats }) {
  return (
    <Section title="Обзор" defaultOpen={true}>
      {periodSelect}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
        {eloSummary && (
          <StatCard label="ELO" value={
            <span className="inline-flex items-baseline gap-1.5">
              {eloSummary.current}
              {eloSummary.recentDelta !== 0 && (
                <span className={`text-xs ${eloSummary.recentDelta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {eloSummary.recentDelta > 0 ? "+" : ""}{eloSummary.recentDelta}
                </span>
              )}
            </span>
          } />
        )}
        <StatCard label="Игры" value={stats.totalGames} />
        <StatCard label="Победы" value={stats.wins} />
        {stats.draws > 0 && (
          <StatCard label="Ничьи" value={<span className="text-indigo-400">{stats.draws}</span>} />
        )}
        <StatCard label="Поражения" value={stats.losses} />
        <StatCard label="Winrate" value={fmtWr(stats.winrate)} />
        <StatCard label="Баллы" value={fmtScore(stats.totalScore)} />
        <StatCard label="Ср. балл" value={stats.avgScore.toFixed(2)} />
        <StatCard label="Ср. доп." value={
          <span className={
            stats.avgBonus > 0 ? "text-emerald-400" :
            stats.avgBonus < 0 ? "text-red-400" : ""
          }>
            {stats.avgBonus.toFixed(2)}
          </span>
        } />
        {killRateData && (
          <StatCard label="ПУ%" value={
            <span className={
              killRateData.killRate > 25 ? "text-red-400" :
              killRateData.killRate < 10 ? "text-emerald-400" : ""
            }>
              {killRateData.killRate.toFixed(1)}%
              <span className="text-xs text-slate-500 ml-1">({killRateData.timesKilled}/{killRateData.gamesTracked})</span>
            </span>
          } />
        )}
      </div>

      {tournamentStats.length > 0 && (
        <div className="glass-card rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Последние турниры</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-indigo-500/10">
                  <th className="text-left px-2 py-1.5 font-medium text-slate-400">Турнир</th>
                  <th className="text-left px-2 py-1.5 font-medium text-slate-400">Дата</th>
                  <th className="text-center px-2 py-1.5 font-medium text-slate-400">Игр</th>
                  <th className="text-center px-2 py-1.5 font-medium text-slate-400">Побед</th>
                  <th className="text-center px-2 py-1.5 font-medium text-slate-400">WR%</th>
                  <th className="text-center px-2 py-1.5 font-medium text-slate-400">Баллы</th>
                  <th className="text-center px-2 py-1.5 font-medium text-slate-400">Ср. балл</th>
                </tr>
              </thead>
              <tbody>
                {tournamentStats.map((t) => (
                  <tr key={t.id} className="border-b border-indigo-500/10 last:border-b-0">
                    <td className="px-2 py-1.5 font-medium">{t.name}</td>
                    <td className="px-2 py-1.5 text-slate-400">{formatDate(t.date)}</td>
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
