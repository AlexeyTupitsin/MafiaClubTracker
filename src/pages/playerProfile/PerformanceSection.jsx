import { ArrowRightLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "../../components/ui";
import { RoleWinrateChart } from "../../components/RoleWinrateChart";
import { ROLE_NAMES, ROLE_BADGE_VARIANT, ROLE_COLORS } from "../../lib/constants";
import { Section } from "./Section";
import { fmtWr } from "./profileLogic";

const killRateClass = (rate) => (rate > 25 ? "text-red-400" : rate < 10 ? "text-emerald-400" : "");

// Результативность: статистика по ролям с графиком, тренд формы, сравнение
export function PerformanceSection({ roleStats, roleKillRates, formTrend, onCompare }) {
  const chartGroups = roleStats
    .filter((r) => r.games > 0)
    .map((r) => ({
      label: ROLE_NAMES[r.role],
      bars: [{ value: Math.round(r.winrate), color: ROLE_COLORS[r.role] }],
    }));

  return (
    <Section title="Результативность" defaultOpen={true}>
      <div className="glass-card rounded-2xl p-4 mb-4">
        <h3 className="font-semibold mb-3">Статистика по ролям</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-indigo-500/10">
                <th className="text-left py-1.5 font-medium text-slate-400">Роль</th>
                <th className="text-center py-1.5 font-medium text-slate-400">Игр</th>
                <th className="text-center py-1.5 font-medium text-slate-400">Побед</th>
                <th className="text-center py-1.5 font-medium text-slate-400">WR%</th>
                <th className="text-center py-1.5 font-medium text-slate-400">Ср. балл</th>
                <th className="text-center py-1.5 font-medium text-slate-400">Ср. доп.</th>
                <th className="text-center py-1.5 font-medium text-slate-400">ПУ%</th>
              </tr>
            </thead>
            <tbody>
              {roleStats.map((r) => {
                const rk = roleKillRates.find((x) => x.role === r.role);
                return (
                  <tr key={r.role} className="border-b border-indigo-500/10 last:border-b-0">
                    <td className="py-1.5">
                      <Badge variant={ROLE_BADGE_VARIANT[r.role]}>{ROLE_NAMES[r.role]}</Badge>
                    </td>
                    <td className="py-1.5 text-center">{r.games}</td>
                    <td className="py-1.5 text-center">{r.wins}</td>
                    <td className="py-1.5 text-center">
                      {r.games > 0 ? fmtWr(r.winrate) : "—"}
                    </td>
                    <td className="py-1.5 text-center">
                      {r.games > 0 ? r.avgScore.toFixed(2) : "—"}
                    </td>
                    <td className="py-1.5 text-center">
                      {r.games > 0 ? (
                        <span className={
                          r.avgBonus > 0 ? "text-emerald-400" :
                          r.avgBonus < 0 ? "text-red-400" : ""
                        }>
                          {r.avgBonus.toFixed(2)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-1.5 text-center text-xs">
                      {!rk || rk.killRate === null ? "—" : (
                        <span className={killRateClass(rk.killRate)}>{rk.killRate.toFixed(1)}%</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {chartGroups.length > 0 ? (
            <RoleWinrateChart groups={chartGroups} />
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              Недостаточно данных для графика
            </div>
          )}
        </div>
      </div>

      {formTrend && formTrend.recentGames >= 3 && <FormTrend trend={formTrend} />}

      <button onClick={onCompare}
        className="flex items-center gap-2 px-4 py-2 btn-ghost cursor-pointer text-sm transition-colors mt-4">
        <ArrowRightLeft size={16} /> Сравнить с...
      </button>
    </Section>
  );
}

function FormTrend({ trend }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="font-semibold mb-3">Тренд формы (последние {trend.recentGames} игр)</h3>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {trend.recentResults.map((r, i) => (
          <span key={i} className={`w-7 h-7 flex items-center justify-center rounded text-sm ${
            r === "win" ? "bg-emerald-500/10 text-emerald-400" :
            r === "draw" ? "bg-amber-500/10 text-amber-400" :
            "bg-red-500/10 text-red-400"
          }`}>
            {r === "win" ? "✅" : r === "draw" ? "➖" : "❌"}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-slate-400">WR за {trend.recentGames}:</span>{" "}
          <span className="font-medium">{trend.recentWinrate.toFixed(0)}%</span>
          <span className="text-slate-500"> vs {trend.overallWinrate.toFixed(0)}%</span>
        </div>
        <div>
          <span className="text-slate-400">Ср. балл за {trend.recentGames}:</span>{" "}
          <span className="font-medium">{trend.recentAvgScore.toFixed(2)}</span>
          <span className="text-slate-500"> vs {trend.overallAvgScore.toFixed(2)}</span>
        </div>
        <div>
          {trend.trend === "up" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium">
              <TrendingUp size={12} /> На подъёме
            </span>
          )}
          {trend.trend === "stable" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium">
              <Minus size={12} /> Стабильно
            </span>
          )}
          {trend.trend === "down" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
              <TrendingDown size={12} /> В спаде
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
