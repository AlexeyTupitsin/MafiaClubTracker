import { useState, useMemo } from "react";
import { ArrowLeft, Pencil, Trash2, Award, Sword, Crown } from "lucide-react";
import { BackButton, Button, ConfirmDialog, EmptyState, PlayerAvatar } from "../components/ui";
import { RatingTable } from "../components/RatingTable";
import { TeamBalance } from "../components/TeamBalance";
import { NominationList } from "../components/NominationList";
import { calcPlayerStats, calcKillRate } from "../lib/metrics";
import { NOMINATION_CONFIG, TEAM_NAMES } from "../lib/constants";
import { formatDate, compareGamesDesc, signedClass, winrateClass } from "../lib/utils";
import { AdminOnly } from "../components/auth/AuthGuard";
import { deleteTournament } from "../lib/queries";
import { ShareImageButton } from "../components/share/ShareImageButton";
import { renderTournamentCard } from "../lib/shareImage/tournamentCard";

// Проверка «турнир не найден» — отдельно от содержимого: хуки нельзя вызывать
// после раннего return (турнир может появиться позже, когда догрузятся данные).
export function TournamentDetail(props) {
  const { tournament, goBack } = props;
  if (!tournament) {
    return (
      <EmptyState icon={Award} title="Турнир не найден"
        action={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => goBack()}>
            Назад
          </Button>
        }
      />
    );
  }
  return <TournamentDetailContent {...props} />;
}

function TournamentDetailContent({
  tournament, allGames, players, navigate, seasons, goBack,
  showToast, refreshAllTournaments,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tournamentGames = useMemo(
    () => (allGames || []).filter((g) => g.tournamentId === tournament.id),
    [allGames, tournament.id]
  );

  const totalGames = tournamentGames.length;
  const redWins = tournamentGames.filter((g) => g.winner === "red").length;
  const blackWins = tournamentGames.filter((g) => g.winner === "black").length;
  const draws = tournamentGames.filter((g) => g.winner === "draw").length;

  const ratingData = useMemo(() => {
    const playerIds = new Set();
    tournamentGames.forEach((g) => g.players.forEach((p) => playerIds.add(p.playerId)));

    return Array.from(playerIds).map((pid) => {
      const player = players.find((p) => p.id === pid);
      const stats = calcPlayerStats(pid, tournamentGames);
      const kr = calcKillRate(pid, tournamentGames, seasons);
      return { id: pid, nickname: player?.nickname || "?", ...stats, killRate: kr };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [tournamentGames, players, seasons]);

  const minGames = useMemo(() => Math.max(1, Math.floor(totalGames * 0.5)), [totalGames]);

  const nominations = useMemo(() => {
    const roles = ["citizen", "sheriff", "mafia", "don"];
    const result = {};
    for (const role of roles) {
      const playerScores = [];
      for (const player of players) {
        const roleGames = tournamentGames.flatMap((g) =>
          g.players.filter((p) => p.playerId === player.id && p.role === role)
        );
        if (roleGames.length < 1) continue;
        const wins = roleGames.filter((p) => p.result === "win").length;
        const totalScore = roleGames.reduce((sum, p) => sum + p.totalScore, 0);
        const totalBonus = roleGames.reduce((sum, p) => sum + p.bonusScore, 0);
        playerScores.push({
          playerId: player.id, nickname: player.nickname,
          games: roleGames.length, wins,
          winrate: (wins / roleGames.length) * 100,
          avgScore: totalScore / roleGames.length,
          avgBonus: totalBonus / roleGames.length,
        });
      }
      result[role] = playerScores.sort((a, b) => b.avgBonus - a.avgBonus).slice(0, 5);
    }
    return result;
  }, [tournamentGames, players]);

  const renderShareImage = () => renderTournamentCard({
    name: tournament.name,
    date: formatDate(tournament.date),
    totalGames,
    redWins,
    blackWins,
    draws,
    rows: ratingData.slice(0, 10).map((row) => ({
      ...row,
      avatarUrl: players.find((p) => p.id === row.id)?.avatarUrl ?? null,
    })),
    bestByRole: ["citizen", "sheriff", "mafia", "don"]
      .filter((role) => nominations[role]?.length > 0)
      .map((role) => ({ role, nickname: nominations[role][0].nickname })),
  });

  const handleDelete = async () => {
    try {
      await deleteTournament(tournament.id);
      await refreshAllTournaments?.();
      showToast?.(`Турнир "${tournament.name}" удалён`);
      goBack();
    } catch (err) {
      showToast?.("Ошибка: " + (err.message || "неизвестная ошибка"), "error");
    }
  };

  const fmtSigned = (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
  const columns = [
    { key: "totalGames", label: "Игры" },
    { key: "wins", label: "Побед" },
    { key: "winrate", label: "WR", render: (r) => <span className={winrateClass(r.winrate)}>{r.winrate.toFixed(0)}%</span> },
    { key: "totalScore", label: "Баллы", render: (r) => (r.totalScore % 1 === 0 ? r.totalScore : r.totalScore.toFixed(1)) },
    { key: "avgScore", label: "Ср. балл", render: (r) => r.avgScore.toFixed(2) },
    { key: "avgBonus", label: "Ср. доп.", render: (r) => <span className={signedClass(r.avgBonus)}>{fmtSigned(r.avgBonus)}</span> },
  ];
  const leader = ratingData[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start gap-3">
        <BackButton onClick={() => goBack()} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Турнир · {formatDate(tournament.date)}</p>
          <h2 className="page-title mt-1.5 break-words">{tournament.name}</h2>
        </div>
        {totalGames > 0 && (
          <ShareImageButton
            className="shrink-0"
            render={renderShareImage}
            fileName={`iron-maf-tournament-${String(tournament.date).slice(0, 10)}.png`}
            title={`Итоги: ${tournament.name}`}
            showToast={showToast}
          />
        )}
      </header>

      {tournament.notes && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          {tournament.notes}
        </div>
      )}

      {totalGames > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {leader && (
            <button onClick={() => navigate("playerProfile", leader.id)}
              className="card card-link relative overflow-hidden p-5 md:p-6 lg:col-span-2 text-left">
              <div className="pointer-events-none absolute -top-28 -left-20 w-80 h-80 rounded-full bg-accent-400/10 blur-3xl" aria-hidden="true" />
              <p className="eyebrow flex items-center gap-1.5 relative">
                <Crown size={14} className="text-accent-400" aria-hidden="true" /> Победитель турнира
              </p>
              <div className="relative mt-4 flex items-center gap-4">
                <span className="rounded-full ring-2 ring-accent-400 ring-offset-4 ring-offset-elev-1 shrink-0">
                  <PlayerAvatar player={players.find((p) => p.id === leader.id)} size="md" clickable={false} />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-2xl md:text-3xl font-bold text-stone-50 truncate">{leader.nickname}</span>
                  <span className="block text-sm text-stone-400 mt-1 font-data">
                    ср. балл <span className="text-accent-300 font-semibold">{leader.avgScore.toFixed(2)}</span> · {leader.wins} из {leader.totalGames} побед
                  </span>
                </span>
              </div>
            </button>
          )}
          <TeamBalance label="Сыграно" totalGames={totalGames} redWins={redWins} blackWins={blackWins} draws={draws} />
        </div>
      )}

      {ratingData.length > 0 && (
        <section className="card overflow-hidden" aria-labelledby="t-rating-title">
          <h3 id="t-rating-title" className="font-display text-base font-bold text-stone-50 px-4 md:px-5 pt-4 pb-2">Рейтинг турнира</h3>
          <RatingTable rows={ratingData.map((r) => ({ ...r, avatarUrl: players.find((p) => p.id === r.id)?.avatarUrl }))}
            columns={columns} sortCol="avgScore" sortDir="desc" onSort={() => {}} navigate={navigate} />
        </section>
      )}

      {totalGames > 0 && (
        <section aria-labelledby="t-nom-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h3 id="t-nom-title" className="font-display text-base font-bold text-stone-50">Номинации</h3>
            <p className="text-xs text-stone-500">
              От {minGames} {minGames === 1 ? "игры" : "игр"} в роли
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {NOMINATION_CONFIG.map(({ role, icon, label }) => (
              (nominations[role] || []).length > 0 && (
                <NominationList key={role} role={role} icon={icon} label={label} top={nominations[role]} navigate={navigate} />
              )
            ))}
          </div>
        </section>
      )}

      {tournamentGames.length > 0 && (
        <section className="card overflow-hidden" aria-labelledby="t-games-title">
          <h3 id="t-games-title" className="font-display text-base font-bold text-stone-50 px-4 md:px-5 pt-4 pb-2">Игры турнира</h3>
          <ul>
            {[...tournamentGames].sort(compareGamesDesc).map((g) => (
              <li key={g.id} className="border-t border-line">
                <button onClick={() => navigate("gameDetail", g.id)}
                  className="flex items-center gap-4 w-full h-12 px-4 md:px-5 text-sm text-left hover:bg-elev-2 cursor-pointer">
                  <span className={`w-[3px] h-6 rounded-full ${g.winner === "red" ? "bg-red-500" : g.winner === "draw" ? "bg-amber-400" : "bg-stone-500"}`} aria-hidden="true" />
                  <span className="font-data font-semibold text-stone-100 w-10">#{g.gameNumber}</span>
                  <span className="text-stone-400 font-data">{formatDate(g.date)}</span>
                  <span className={`ml-auto font-medium ${g.winner === "red" ? "text-red-400" : g.winner === "draw" ? "text-amber-400" : "text-stone-200"}`}>
                    {TEAM_NAMES[g.winner]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {totalGames === 0 && (
        <EmptyState icon={Sword} title="Нет игр" description="В этом турнире пока нет игр" />
      )}

      {/* Actions */}
      <AdminOnly>
        <div className="flex flex-wrap gap-2 pt-4 border-t border-line">
          <Button variant="secondary" icon={Pencil} onClick={() => navigate("tournamentForm", tournament.id)}>
            Редактировать турнир
          </Button>
          <Button variant="danger-soft" icon={Trash2} onClick={() => setConfirmDelete(true)} className="ml-auto">
            Удалить
          </Button>
        </div>
      </AdminOnly>

      {confirmDelete && (
        <ConfirmDialog title="Удалить турнир?"
          message={`Турнир "${tournament.name}" будет удалён. Игры останутся.`}
          onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)}
          confirmText="Удалить" danger />
      )}
    </div>
  );
}
