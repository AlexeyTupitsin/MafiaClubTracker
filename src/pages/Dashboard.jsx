import { useState, useMemo } from "react";
import { Plus, Sword, Users, ArrowRight, Crown, Sparkles } from "lucide-react";
import { Button, EmptyState, PlayerAvatar } from "../components/ui";
import { calcSeasonStats, calcExtendedNominations, calcPlayerStats, calcKillRate, calcThreshold } from "../lib/metrics";
import { NOMINATION_CONFIG, ROLE_TONE } from "../lib/constants";
import { CLUB_NAME } from "../lib/clubConfig";
import { pluralize, signedClass, winrateClass } from "../lib/utils";
import { AdminOnly } from "../components/auth/AuthGuard";
import { useAuth } from "../hooks/useAuth";
import { ShareImageButton } from "../components/share/ShareImageButton";
import { RatingTable } from "../components/RatingTable";
import { TeamBalance } from "../components/TeamBalance";
import { renderRatingCard } from "../lib/shareImage/ratingCard";

// Подписи колонок таблицы — для строки «Сортировка: …» на картинке
const SORT_LABELS = {
  nickname: "Ник",
  totalGames: "Игры",
  wins: "Побед",
  winrate: "WR%",
  totalScore: "Баллы",
  avgScore: "Ср. балл",
  avgBonus: "Ср. доп.",
};

const TOP_ROWS = 10;
const fmt2 = (v) => v.toFixed(2);
const fmtSigned = (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
const games_ = (n) => `${n} ${pluralize(n, "игра", "игры", "игр")}`;

function Metric({ label, value, className = "" }) {
  return (
    <div>
      <div className={`font-data text-lg font-semibold text-stone-100 ${className}`}>{value}</div>
      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
    </div>
  );
}

// Лидер сезона + 2-е и 3-е места
function LeaderHero({ podium, navigate }) {
  const [leader, ...rest] = podium;
  return (
    <section className="card relative overflow-hidden p-5 md:p-6 lg:col-span-2" aria-labelledby="leader-title">
      {/* латунный свет из угла — единственный декоративный эффект на странице */}
      <div className="pointer-events-none absolute -top-28 -left-20 w-80 h-80 rounded-full bg-accent-400/10 blur-3xl" aria-hidden="true" />
      <p id="leader-title" className="eyebrow flex items-center gap-1.5 relative">
        <Crown size={14} className="text-accent-400" aria-hidden="true" /> Лидер сезона
      </p>
      <div className="relative mt-4 flex flex-col xl:flex-row xl:items-center gap-5">
        <button onClick={() => navigate("playerProfile", leader.id)} className="flex items-center gap-4 min-w-0 text-left cursor-pointer group">
          <span className="rounded-full ring-2 ring-accent-400 ring-offset-4 ring-offset-elev-1 shrink-0">
            <PlayerAvatar player={leader} size="md" clickable={false} />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-2xl md:text-3xl font-bold text-stone-50 truncate group-hover:text-accent-200 transition-colors">
              {leader.nickname}
            </span>
            <span className="block text-sm text-stone-400 mt-1">
              {games_(leader.totalGames)} · {leader.wins} {pluralize(leader.wins, "победа", "победы", "побед")}
            </span>
          </span>
        </button>
        <div className="xl:ml-auto grid grid-cols-4 gap-4 sm:gap-8 xl:gap-6 shrink-0">
          <Metric label="Ср. балл" value={fmt2(leader.avgScore)} className="!text-accent-300" />
          <Metric label="Победы" value={`${leader.winrate.toFixed(0)}%`} />
          <Metric label="Доп." value={fmtSigned(leader.avgBonus)} className={signedClass(leader.avgBonus)} />
          <Metric label="ELO" value={leader.elo != null ? Math.round(leader.elo) : "—"} />
        </div>
      </div>

      {rest.length > 0 && (
        <ol className="relative mt-6 pt-4 border-t border-line grid sm:grid-cols-2 gap-x-6 gap-y-1">
          {rest.map((p, i) => (
            <li key={p.id}>
              <button onClick={() => navigate("playerProfile", p.id)}
                className="flex items-center gap-3 w-full h-11 px-2 -mx-2 rounded-xl text-left hover:bg-elev-2 cursor-pointer">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-data shrink-0 ${
                  i === 0 ? "bg-stone-300 text-stone-900" : "bg-accent-800 text-accent-100"}`}>{i + 2}</span>
                <PlayerAvatar player={p} size="xs" clickable={false} />
                <span className="font-medium text-stone-100 truncate">{p.nickname}</span>
                <span className="ml-auto font-data text-sm text-stone-300">{fmt2(p.avgScore)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function NominationCard({ label, icon: Icon, tone, player, navigate, className = "" }) {
  const body = (
    <>
      <span className="flex items-center gap-2 min-w-0">
        <span className={`w-7 h-7 rounded-full ring-1 ring-inset flex items-center justify-center shrink-0 ${tone}`}>
          <Icon size={14} aria-hidden="true" />
        </span>
        <span className="text-xs text-stone-400 leading-tight">{label}</span>
      </span>
      <span className="mt-3 block font-medium text-stone-100 truncate group-hover:text-accent-200">
        {player ? player.nickname : "—"}
      </span>
      {player && (
        <span className="mt-0.5 flex items-baseline gap-1.5 font-data text-xs whitespace-nowrap">
          <span className={`text-sm font-semibold ${signedClass(player.avgBonus)}`}>{fmtSigned(player.avgBonus)}</span>
          <span className="text-stone-500 truncate">{games_(player.totalGames)}</span>
        </span>
      )}
    </>
  );
  if (!player) return <div className={`card p-4 min-w-0 ${className}`}>{body}</div>;
  return (
    <button onClick={() => navigate("playerProfile", player.id)}
      className={`card card-link group p-4 min-w-0 text-left ${className}`}>
      {body}
    </button>
  );
}

export function Dashboard({ games, players, navigate, currentSeason, seasons, showToast }) {
  const { isAdmin } = useAuth();
  const hasPlayers = players.length > 0;
  const [showAll, setShowAll] = useState(false);
  const [sortCol, setSortCol] = useState("avgScore");
  const [sortDir, setSortDir] = useState("desc");

  const hasGames = games.length > 0;
  const dashStats = useMemo(() => calcSeasonStats(games), [games]);
  const { nominations } = useMemo(() => calcExtendedNominations(games, players), [games, players]);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const ratingData = useMemo(() => {
    const playerIds = new Set();
    games.forEach((g) => g.players.forEach((p) => playerIds.add(p.playerId)));
    return Array.from(playerIds).map((pid) => {
      const player = playerById.get(pid);
      const stats = calcPlayerStats(pid, games);
      const kr = calcKillRate(pid, games, seasons);
      return {
        id: pid,
        nickname: player?.nickname || "?",
        avatarUrl: player?.avatarUrl,
        elo: player?.eloGames > 0 ? player.elo : null,
        ...stats,
        killRate: kr,
      };
    });
  }, [games, playerById, seasons]);

  const threshold = useMemo(() => calcThreshold(currentSeason, games.length), [currentSeason, games.length]);
  const eligible = useMemo(
    () => ratingData.filter((r) => threshold === 0 || r.totalGames >= threshold),
    [ratingData, threshold]
  );
  const hasBelowThreshold = threshold > 0 && eligible.length < ratingData.length;

  const podium = useMemo(
    () => [...eligible].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3),
    [eligible]
  );

  const mvpPlayer = useMemo(() => {
    if (eligible.length === 0) return null;
    return eligible.reduce((best, r) => (r.avgBonus > best.avgBonus ? r : best));
  }, [eligible]);

  const nominationLeaders = useMemo(() => {
    const result = {};
    for (const { role } of NOMINATION_CONFIG) {
      const top = (nominations[role] || []).find((nom) => {
        if (threshold === 0) return true;
        const rd = ratingData.find((r) => r.id === nom.playerId);
        return rd && rd.totalGames >= threshold;
      });
      result[role] = top
        ? { id: top.playerId, nickname: top.nickname, totalGames: top.games, avgBonus: top.avgBonus }
        : null;
    }
    return result;
  }, [nominations, ratingData, threshold]);

  const filteredRating = useMemo(() => {
    const data = showAll ? ratingData : eligible;
    return [...data].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [ratingData, eligible, showAll, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const renderShareImage = () => {
    const sortLabel = SORT_LABELS[sortCol];
    return renderRatingCard({
      periodName: currentSeason?.name ?? "Рейтинг",
      roleName: null,
      totalGames: games.length,
      minGames: showAll ? 0 : threshold,
      sortLabel: sortLabel ? `${sortLabel} ${sortDir === "asc" ? "↑" : "↓"}` : null,
      rows: filteredRating.slice(0, 15).map((row) => ({ ...row, avatarUrl: row.avatarUrl ?? null })),
    });
  };

  const columns = [
    { key: "totalGames", label: "Игры", sortable: true },
    { key: "wins", label: "Побед", sortable: true },
    { key: "winrate", label: "WR", sortable: true, title: "Процент побед",
      render: (r) => <span className={winrateClass(r.winrate)}>{r.winrate.toFixed(0)}%</span> },
    { key: "totalScore", label: "Баллы", sortable: true,
      render: (r) => (r.totalScore % 1 === 0 ? r.totalScore : r.totalScore.toFixed(1)) },
    { key: "avgScore", label: "Ср. балл", sortable: true, title: "Средний балл за игру", render: (r) => fmt2(r.avgScore) },
    { key: "avgBonus", label: "Ср. доп.", sortable: true, title: "Средний дополнительный балл",
      render: (r) => <span className={signedClass(r.avgBonus)}>{fmtSigned(r.avgBonus)}</span> },
    { key: "killRate", label: "ПУ", title: "Процент первых убийств",
      render: (r) => (r.killRate ? `${r.killRate.killRate.toFixed(0)}%` : <span className="text-stone-600">—</span>) },
  ];

  // Первый запуск: игроков ещё нет
  if (!hasPlayers) {
    return (
      <div className="text-center py-16">
        <img src="/logo.jpg" alt="" className="w-20 h-20 mx-auto mb-6 rounded-2xl object-cover ring-1 ring-line-strong" />
        <h2 className="page-title mb-3">Добро пожаловать в {CLUB_NAME}</h2>
        <p className="text-stone-400 mb-8 max-w-md mx-auto">
          Добавьте игроков клуба и запишите первую игру — рейтинг и статистика посчитаются сами.
        </p>
        {isAdmin ? (
          <div className="flex flex-col items-center gap-3">
            <Button icon={Users} onClick={() => navigate("players")} className="w-full sm:w-auto">
              Добавить игроков
            </Button>
            <p className="text-[13px] text-stone-500">Записать игру можно, когда в составе будет 10 игроков</p>
          </div>
        ) : (
          <p className="text-[13px] text-stone-500">Ведущий клуба скоро добавит игроков</p>
        )}
      </div>
    );
  }

  const canAddGame = currentSeason?.isActive;

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{currentSeason?.isActive ? "Текущий сезон" : "Сезон"}</p>
          <h2 className="page-title mt-1.5">{currentSeason?.name ?? "Обзор"}</h2>
        </div>
        {canAddGame && hasGames && (
          <AdminOnly>
            <Button icon={Plus} onClick={() => navigate("gameForm")} className="w-full sm:w-auto">
              Записать игру
            </Button>
          </AdminOnly>
        )}
      </header>

      {!hasGames ? (
        <EmptyState
          icon={Sword}
          title="В этом сезоне ещё не играли"
          description="Запишите первую игру — здесь появятся лидер сезона, рейтинг и номинации."
          action={isAdmin && canAddGame ? (
            <Button icon={Plus} onClick={() => navigate("gameForm")}>
              Записать первую игру
            </Button>
          ) : null}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {podium.length > 0 && <LeaderHero podium={podium} navigate={navigate} />}
            <TeamBalance totalGames={dashStats.totalGames} redWins={dashStats.redWins} blackWins={dashStats.blackWins} draws={dashStats.draws} />
          </div>

          <section className="card overflow-hidden" aria-labelledby="rating-title">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-5 pt-4 pb-2">
              <h3 id="rating-title" className="font-display text-base font-bold text-stone-50">Рейтинг</h3>
              <div className="flex items-center gap-1">
                {hasBelowThreshold && (
                  <button onClick={() => setShowAll(!showAll)}
                    className="h-9 px-3 rounded-lg text-sm text-stone-400 hover:text-stone-100 hover:bg-elev-2 cursor-pointer">
                    {showAll ? `Только от ${threshold} игр` : "Все игроки"}
                  </button>
                )}
                {filteredRating.length > 0 && (
                  <ShareImageButton
                    render={renderShareImage}
                    fileName={`iron-maf-rating-${new Date().toISOString().slice(0, 10)}.png`}
                    title="Рейтинг"
                    showToast={showToast}
                  />
                )}
              </div>
            </div>
            {filteredRating.length === 0 ? (
              <p className="text-stone-500 text-sm py-8 text-center">Нет данных для рейтинга</p>
            ) : (
              <>
                <RatingTable
                  rows={filteredRating.slice(0, TOP_ROWS)}
                  columns={columns}
                  sortCol={sortCol}
                  sortDir={sortDir}
                  onSort={handleSort}
                  navigate={navigate}
                />
                {filteredRating.length > TOP_ROWS && (
                  <button onClick={() => navigate("rating")}
                    className="flex items-center justify-center gap-1.5 w-full h-12 border-t border-line text-sm font-medium text-stone-300 hover:text-accent-300 hover:bg-elev-2 cursor-pointer">
                    Весь рейтинг · {filteredRating.length} {pluralize(filteredRating.length, "игрок", "игрока", "игроков")}
                    <ArrowRight size={15} />
                  </button>
                )}
              </>
            )}
          </section>

          <section aria-labelledby="nom-title">
            <h3 id="nom-title" className="font-display text-base font-bold text-stone-50 mb-3">Номинации</h3>
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
              <NominationCard label="MVP" icon={Sparkles} className="col-span-2 xl:col-span-1"
                tone="text-accent-300 bg-accent-400/10 ring-accent-400/30" player={mvpPlayer} navigate={navigate} />
              {NOMINATION_CONFIG.map(({ role, label, icon }) => (
                <NominationCard key={role} label={label} icon={icon} tone={ROLE_TONE[role]}
                  player={nominationLeaders[role]} navigate={navigate} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
