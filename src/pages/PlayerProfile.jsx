import { useMemo } from "react";
import { useHashParam } from "../hooks/useHashParam";
import { placeHistory } from "../lib/standings";
import { PlaceSection } from "./playerProfile/PlaceSection";
import { ArrowLeft, User, Sword } from "lucide-react";
import { Button, EmptyState } from "../components/ui";
import { calcPlayerStats, calcRoleStats, calcFormTrend, calcKillRate, calcRoleKillRate, calcBestMoveStats } from "../lib/metrics";
import { playerEloHistory } from "../lib/elo";
import {
  gamesForPeriod, recentTournamentStats, partnerStats, partnerHighlights, eloSummary as summarizeElo, playerGameHistory,
  fmtScore, fmtWr,
} from "./playerProfile/profileLogic";
import { ProfileHeader, PeriodSelect } from "./playerProfile/ProfileHeader";
import { OverviewSection } from "./playerProfile/OverviewSection";
import { EloSection } from "./playerProfile/EloSection";
import { PerformanceSection } from "./playerProfile/PerformanceSection";
import { BestMoveSection } from "./playerProfile/BestMoveSection";
import { InteractionSection } from "./playerProfile/InteractionSection";

// Проверка «игрок не найден» — отдельно от содержимого: хуки нельзя вызывать
// после раннего return (игрок может появиться позже, когда догрузятся данные).
export function PlayerProfile(props) {
  const { player, goBack } = props;
  if (!player) {
    return (
      <EmptyState
        icon={User}
        title="Игрок не найден"
        action={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => goBack()}>
            Назад
          </Button>
        }
      />
    );
  }
  return <PlayerProfileContent {...props} />;
}

function PlayerProfileContent({ player, players, navigate, seasons, currentSeasonId, allGames, tournaments, goBack }) {
  // Период — в адресе: «назад» из игры возвращает к той же статистике
  const [period, setPeriod] = useHashParam("period", "all");

  const activeGames = useMemo(() => gamesForPeriod(period, allGames), [period, allGames]);

  const stats = useMemo(() => calcPlayerStats(player.id, activeGames), [player.id, activeGames]);
  const roleStats = useMemo(() => calcRoleStats(player.id, activeGames), [player.id, activeGames]);
  const formTrend = useMemo(() => calcFormTrend(player.id, activeGames), [player.id, activeGames]);
  const killRateData = useMemo(() => calcKillRate(player.id, activeGames, seasons), [player.id, activeGames, seasons]);
  const roleKillRates = useMemo(() => calcRoleKillRate(player.id, activeGames, seasons), [player.id, activeGames, seasons]);
  const pairs = useMemo(() => partnerStats(player.id, activeGames, players), [player.id, activeGames, players]);
  const highlights = useMemo(() => partnerHighlights(pairs), [pairs]);
  const gameHistory = useMemo(() => playerGameHistory(player.id, activeGames), [player.id, activeGames]);

  // Не зависят от периода: ELO сквозной, лучший ход и турниры — по всем играм
  const bestMoveStats = useMemo(() => calcBestMoveStats(player.id, allGames), [player.id, allGames]);
  const tournamentStats = useMemo(
    () => recentTournamentStats(player.id, tournaments, allGames),
    [player.id, tournaments, allGames]
  );
  const eloHistory = useMemo(() => playerEloHistory(player.id, allGames), [player.id, allGames]);
  const eloSummary = useMemo(() => summarizeElo(eloHistory), [eloHistory]);

  // Место в рейтинге — внутри одного сезона: выбранного в периоде,
  // а при «Все сезоны» — выбранного в боковом меню
  const placeSeason = seasons.find((s) => s.id === (period === "all" ? currentSeasonId : period)) ?? null;
  const placeHistoryRows = useMemo(
    () => (placeSeason ? placeHistory(player.id, allGames.filter((g) => g.seasonId === placeSeason.id), placeSeason) : []),
    [player.id, allGames, placeSeason]
  );

  const showBestMove = bestMoveStats.total > 0 || seasons?.some((s) => s.trackBestMove);
  const periodSelect = <PeriodSelect value={period} onChange={setPeriod} seasons={seasons} />;

  if (stats.totalGames === 0) {
    return (
      <div>
        <div className="mb-4">
          <ProfileHeader player={player} subtitle={player.realName} onBack={() => goBack()} />
        </div>
        {periodSelect}
        <EmptyState icon={Sword} title="Нет игр за выбранный период" />
      </div>
    );
  }

  const subtitle = `${player.realName ? `${player.realName} · ` : ""}`
    + `${stats.totalGames} игр · ${stats.wins} побед · ${fmtWr(stats.winrate)} · ${fmtScore(stats.totalScore)} баллов`;

  return (
    <div className="space-y-6">
      <ProfileHeader player={player} subtitle={subtitle} onBack={() => goBack()} />

      <OverviewSection
        periodSelect={periodSelect}
        stats={stats}
        eloSummary={eloSummary}
        killRateData={killRateData}
        tournamentStats={tournamentStats}
      />

      {placeHistoryRows.length > 0 && <PlaceSection history={placeHistoryRows} season={placeSeason} />}

      {eloSummary && eloHistory.length > 1 && <EloSection history={eloHistory} summary={eloSummary} />}

      <PerformanceSection
        roleStats={roleStats}
        roleKillRates={roleKillRates}
        formTrend={formTrend}
        onCompare={() => navigate("compare", player.id)}
      />

      {showBestMove && <BestMoveSection stats={bestMoveStats} />}

      <InteractionSection pairs={pairs} highlights={highlights} history={gameHistory} navigate={navigate} />
    </div>
  );
}
