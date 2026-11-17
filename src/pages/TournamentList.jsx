import { useState, useMemo } from "react";
import { Plus, Award } from "lucide-react";
import { Button, EmptyState, Select } from "../components/ui";
import { AdminOnly } from "../components/auth/AuthGuard";
import { formatDate, pluralize } from "../lib/utils";

const COL = "grid grid-cols-[1fr_5rem] sm:grid-cols-[1fr_5rem_9rem_9rem] gap-x-4 items-center";

function TournamentListHeader() {
  return (
    <div className={`${COL} px-4 py-1.5 text-xs font-medium text-stone-500`}>
      <span>Турнир</span>
      <span className="text-center">Игр (кр/чёрн)</span>
      <span className="hidden sm:block">Лучший игрок</span>
      <span className="hidden sm:block">MVP</span>
    </div>
  );
}

function TournamentCard({ t, getTournamentData, getPlayerNickname, navigate }) {
  const data = getTournamentData(t);
  return (
    <div onClick={() => navigate("tournamentDetail", t.id)}
      className={`${COL} card card-link px-4 py-3 cursor-pointer`}>
      <div className="min-w-0">
        <p className="font-semibold text-stone-50 truncate">{t.name}</p>
        <p className="text-xs text-stone-500">{formatDate(t.date)}</p>
        {data.total > 0 && (data.bestPlayer || data.mvpPlayer) && (
          <div className="sm:hidden flex flex-wrap gap-x-3 mt-1 text-xs text-stone-500">
            {data.bestPlayer && (
              <span>Лучший: <span className="text-stone-100">{getPlayerNickname(data.bestPlayer.id)}</span></span>
            )}
            {data.mvpPlayer && (
              <span>MVP: <span className="text-stone-100">{getPlayerNickname(data.mvpPlayer.id)}</span></span>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-xs">
        {data.total > 0 ? (
          <>
            <p className="font-data font-semibold text-stone-200">{data.total}</p>
            <p className="text-[11px]">
              <span className="text-red-400">{data.redWins}</span>
              <span className="text-stone-500">/</span>
              <span className="text-stone-400">{data.blackWins}</span>
            </p>
          </>
        ) : <span className="text-stone-500">—</span>}
      </div>

      <div className="hidden sm:block text-xs min-w-0">
        {data.bestPlayer ? (
          <>
            <p className="text-stone-100 truncate">{getPlayerNickname(data.bestPlayer.id)}</p>
            <p className="text-stone-500 font-data">{data.bestPlayer.avgScore.toFixed(2)}</p>
          </>
        ) : <span className="text-stone-500">—</span>}
      </div>

      <div className="hidden sm:block text-xs min-w-0">
        {data.mvpPlayer ? (
          <>
            <p className="text-stone-100 truncate">{getPlayerNickname(data.mvpPlayer.id)}</p>
            <p className="text-stone-500 font-data">{data.mvpPlayer.avgBonus > 0 ? "+" : ""}{data.mvpPlayer.avgBonus.toFixed(2)}</p>
          </>
        ) : <span className="text-stone-500">—</span>}
      </div>
    </div>
  );
}

export function TournamentList({ allTournaments, allGames, seasons, players, navigate }) {
  const [seasonFilter, setSeasonFilter] = useState("all");

  const filteredTournaments = useMemo(() => {
    const list = seasonFilter === "all"
      ? allTournaments
      : (allTournaments || []).filter((t) => t.seasonId === seasonFilter);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [seasonFilter, allTournaments]);

  const groupedTournaments = useMemo(() => {
    if (seasonFilter !== "all") return null;
    const groups = {};
    filteredTournaments.forEach((t) => {
      if (!groups[t.seasonId]) groups[t.seasonId] = [];
      groups[t.seasonId].push(t);
    });
    return seasons
      .filter((s) => groups[s.id])
      .map((s) => ({ season: s, tournaments: groups[s.id] }));
  }, [filteredTournaments, seasons, seasonFilter]);

  const getTournamentData = (tournament) => {
    const tGames = (allGames || []).filter((g) => g.tournamentId === tournament.id);
    const redWins = tGames.filter((g) => g.winner === "red").length;
    const blackWins = tGames.filter((g) => g.winner === "black").length;
    const draws = tGames.filter((g) => g.winner === "draw").length;
    const total = tGames.length;

    let bestPlayer = null;
    let mvpPlayer = null;

    if (total > 0) {
      const stats = {};
      tGames.forEach((g) => {
        g.players.forEach((p) => {
          if (!stats[p.playerId]) stats[p.playerId] = { totalScore: 0, totalBonus: 0, games: 0 };
          stats[p.playerId].totalScore += p.totalScore;
          stats[p.playerId].totalBonus += p.bonusScore;
          stats[p.playerId].games += 1;
        });
      });

      let bestAvgScore = -Infinity;
      let bestAvgBonus = -Infinity;
      for (const [pid, d] of Object.entries(stats)) {
        const avgScore = d.totalScore / d.games;
        const avgBonus = d.totalBonus / d.games;
        if (avgScore > bestAvgScore) { bestAvgScore = avgScore; bestPlayer = { id: pid, avgScore }; }
        if (avgBonus > bestAvgBonus) { bestAvgBonus = avgBonus; mvpPlayer = { id: pid, avgBonus }; }
      }
    }

    return { redWins, blackWins, draws, total, bestPlayer, mvpPlayer };
  };

  const getPlayerNickname = (playerId) => {
    const p = (players || []).find((pl) => pl.id === playerId);
    return p?.nickname || "?";
  };

  const renderList = (tournaments) => (
    <div className="card overflow-hidden">
      <TournamentListHeader />
      <div className="divide-y divide-line">
        {tournaments.map((t) => (
          <TournamentCard key={t.id} t={t} getTournamentData={getTournamentData} getPlayerNickname={getPlayerNickname} navigate={navigate} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {filteredTournaments.length} {pluralize(filteredTournaments.length, "турнир", "турнира", "турниров")}
          </p>
          <h2 className="page-title mt-1.5">Турниры</h2>
        </div>
        <AdminOnly>
          <Button icon={Plus} onClick={() => navigate("tournamentForm")} className="w-full sm:w-auto">
            Создать турнир
          </Button>
        </AdminOnly>
      </header>

      <div className="flex flex-wrap gap-2">
        <Select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)} aria-label="Сезон" wrapperClassName="w-full sm:w-fit" className="sm:!w-auto sm:min-w-[9rem]">
          <option value="all">Все сезоны</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </div>

      {filteredTournaments.length === 0 ? (
        <EmptyState icon={Award} title="Турниров пока нет"
          description="Турнир объединяет игры одного вечера или серии. Его можно создать здесь или прямо при записи игры."
          action={
            <AdminOnly>
              <Button icon={Plus} onClick={() => navigate("tournamentForm")}>Создать турнир</Button>
            </AdminOnly>
          } />
      ) : groupedTournaments ? (
        <div className="space-y-6">
          {groupedTournaments.map(({ season, tournaments }) => (
            <div key={season.id}>
              <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-2">{season.name}</h3>
              {renderList(tournaments)}
            </div>
          ))}
        </div>
      ) : (
        renderList(filteredTournaments)
      )}
    </div>
  );
}
