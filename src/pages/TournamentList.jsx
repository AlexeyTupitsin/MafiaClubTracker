import { useState, useMemo } from "react";
import { Plus, Award } from "lucide-react";
import { Badge, EmptyState } from "../components/ui";
import { AdminOnly } from "../components/auth/AuthGuard";
import { formatDate } from "../lib/utils";

export function TournamentList({ allTournaments, allGames, seasons, navigate }) {
  const [seasonFilter, setSeasonFilter] = useState("all");

  const activeTournaments = useMemo(() => {
    const list = seasonFilter === "all"
      ? allTournaments
      : (allTournaments || []).filter((t) => t.seasonId === seasonFilter);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [seasonFilter, allTournaments]);

  const getTournamentGames = (tournamentId) => {
    return (allGames || []).filter((g) => g.tournamentId === tournamentId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Турниры</h2>
        <AdminOnly>
          <button onClick={() => navigate("tournamentForm")}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-sm">
            <Plus size={14} /> Создать турнир
          </button>
        </AdminOnly>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border bg-zinc-900 border-zinc-700 text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500">
          <option value="all">Все сезоны</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {activeTournaments.length === 0 ? (
        <EmptyState icon={Award} title="Нет турниров"
          description="Создайте первый турнир или добавьте турнир при создании игры" />
      ) : (
        <div className="bg-[#151515] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left px-3 py-2.5 font-medium text-zinc-500">Название</th>
                  <th className="text-left px-3 py-2.5 font-medium text-zinc-500">Дата</th>
                  <th className="text-center px-3 py-2.5 font-medium text-zinc-500">Игр</th>
                  <th className="text-center px-3 py-2.5 font-medium text-red-500">Кр.</th>
                  <th className="text-center px-3 py-2.5 font-medium text-zinc-500">Чёрн.</th>
                </tr>
              </thead>
              <tbody>
                {activeTournaments.map((t) => {
                  const tGames = getTournamentGames(t.id);
                  const redWins = tGames.filter((g) => g.winner === "red").length;
                  const blackWins = tGames.length - redWins;
                  return (
                    <tr key={t.id}
                      className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                      onClick={() => navigate("tournamentDetail", t.id)}>
                      <td className="px-3 py-2.5 font-medium text-violet-400">{t.name}</td>
                      <td className="px-3 py-2.5 text-zinc-400">{formatDate(t.date)}</td>
                      <td className="px-3 py-2.5 text-center">{tGames.length}</td>
                      <td className="px-3 py-2.5 text-center text-red-400">{redWins}</td>
                      <td className="px-3 py-2.5 text-center">{blackWins}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
