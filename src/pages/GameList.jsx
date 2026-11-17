import { useMemo } from "react";
import { Plus, Sword } from "lucide-react";
import { Badge, Button, EmptyState, Select } from "../components/ui";
import { AdminOnly } from "../components/auth/AuthGuard";
import { useAuth } from "../hooks/useAuth";
import { TEAM_NAMES } from "../lib/constants";
import { formatDate, compareGamesDesc } from "../lib/utils";
import { useHashParam, intParam } from "../hooks/useHashParam";
import { useMe } from "../hooks/useMe";

const PAGE_SIZE = 20;

export function GameList({ games, players, navigate, currentSeason, seasons, currentSeasonId, allGames, allTournaments }) {
  const { isAdmin } = useAuth();
  const [meId] = useMe();
  const canAdd = currentSeason?.isActive;
  // Фильтры живут в адресе — «назад» из игры возвращает к тому же списку.
  // Сезон не задан — берётся выбранный в боковом меню; «all» — все сезоны.
  const [seasonParam, setSeasonParam] = useHashParam("season", null);
  const [winnerFilter, setWinnerFilter] = useHashParam("winner", "all");
  const [playerFilter, setPlayerParam] = useHashParam("player", "all");
  const [tournamentFilter, setTournamentParam] = useHashParam("tournament", "all");
  const [sortOrder, setSortOrder] = useHashParam("sort", "date-desc");
  const [visibleCount, setVisibleCount] = useHashParam("shown", PAGE_SIZE, intParam);

  const seasonFilter = seasonParam ?? currentSeasonId ?? "all";

  // Новый фильтр — список снова с первой страницы
  const resetPaging = () => setVisibleCount(PAGE_SIZE);
  const setSeasonFilter = (v) => {
    setSeasonParam(v === currentSeasonId ? null : v);
    setTournamentParam("all"); // турнир другого сезона в списке не найдётся
    resetPaging();
  };
  const setWinner = (v) => { setWinnerFilter(v); resetPaging(); };
  const setPlayerFilter = (v) => { setPlayerParam(v); resetPaging(); };
  const setTournamentFilter = (v) => { setTournamentParam(v); resetPaging(); };

  // Турниры выбранного периода — для фильтра; все — для названий в строках
  const tournamentsById = useMemo(
    () => new Map((allTournaments || []).map((t) => [t.id, t])),
    [allTournaments]
  );
  const periodTournaments = useMemo(
    () => (allTournaments || []).filter((t) => seasonFilter === "all" || t.seasonId === seasonFilter),
    [allTournaments, seasonFilter]
  );

  const sourceGames = useMemo(() => {
    if (seasonFilter === "all") return allGames || games;
    if (seasonFilter === currentSeasonId) return games;
    return (allGames || games).filter((g) => g.seasonId === seasonFilter);
  }, [seasonFilter, allGames, games, currentSeasonId]);

  const filtered = useMemo(() => {
    let result = [...sourceGames].sort(compareGamesDesc);
    if (winnerFilter !== "all") result = result.filter((g) => g.winner === winnerFilter);
    const playerId = playerFilter === "me" ? meId : playerFilter;
    if (playerId && playerId !== "all") result = result.filter((g) => g.players.some((p) => p.playerId === playerId));
    if (tournamentFilter === "__none__") result = result.filter((g) => !g.tournamentId);
    else if (tournamentFilter !== "all") result = result.filter((g) => g.tournamentId === tournamentFilter);
    return result;
  }, [sourceGames, winnerFilter, playerFilter, tournamentFilter, meId]);

  const sortedGames = useMemo(() => {
    const sorted = [...filtered];
    switch (sortOrder) {
      case "date-asc": return sorted.reverse();
      case "number": return sorted.sort((a, b) => (a.gameNumber || 0) - (b.gameNumber || 0));
      default: return sorted; // date-desc is the default order
    }
  }, [filtered, sortOrder]);

  const visibleGames = useMemo(
    () => sortedGames.slice(0, visibleCount),
    [sortedGames, visibleCount]
  );

  const miniStats = useMemo(() => {
    const total = filtered.length;
    if (total === 0) return null;
    const redWins = filtered.filter((g) => g.winner === "red").length;
    const blackWins = filtered.filter((g) => g.winner === "black").length;
    const draws = filtered.filter((g) => g.winner === "draw").length;
    return {
      total,
      redPct: Math.round((redWins / total) * 100),
      blackPct: Math.round((blackWins / total) * 100),
      draws,
    };
  }, [filtered]);

  const getSeasonName = (seasonId) => {
    const s = seasons.find((x) => x.id === seasonId);
    return s?.name || "?";
  };

  const getTournamentName = (tournamentId) =>
    (tournamentId && tournamentsById.get(tournamentId)?.name) || null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          {miniStats ? (
            <p className="eyebrow">
              {miniStats.total} игр · <span className="text-red-400">красные {miniStats.redPct}%</span> · <span className="text-stone-200">чёрные {miniStats.blackPct}%</span>
              {miniStats.draws > 0 && <> · <span className="text-amber-400">ничьих {miniStats.draws}</span></>}
            </p>
          ) : <p className="eyebrow">Протоколы</p>}
          <h2 className="page-title mt-1.5">Игры</h2>
        </div>
        {canAdd && (
          <AdminOnly>
            <Button icon={Plus} onClick={() => navigate("gameForm")} className="w-full sm:w-auto">
              Записать игру
            </Button>
          </AdminOnly>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {/* Season filter */}
        <Select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)} aria-label="Сезон" wrapperClassName="w-full sm:w-fit" className="sm:!w-auto sm:min-w-[9rem]">
          <option value="all">Все сезоны</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>

        {/* Winner filter */}
        <div className="flex gap-0.5 bg-elev-2 border border-line-strong rounded-[10px] p-0.5" role="group" aria-label="Победитель">
          {[
            { value: "all", label: "Все", dot: null },
            { value: "red", label: "Красные", dot: "bg-red-500" },
            { value: "black", label: "Чёрные", dot: "bg-stone-400" },
            { value: "draw", label: "Ничья", dot: "bg-amber-400" },
          ].map((f) => (
            <button key={f.value} onClick={() => setWinner(f.value)} aria-pressed={winnerFilter === f.value}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium cursor-pointer ${
                winnerFilter === f.value ? "bg-elev-3 text-stone-50 shadow-sm shadow-black/40" : "text-stone-400 hover:text-stone-100"
              }`}>
              {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} aria-hidden="true" />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Player filter */}
        <Select
          value={playerFilter}
          onChange={(e) => setPlayerFilter(e.target.value)} aria-label="Игрок" wrapperClassName="w-full sm:w-fit" className="sm:!w-auto sm:min-w-[9rem]">
          <option value="all">Все игроки</option>
          {meId && <option value="me">Мои игры</option>}
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.nickname}</option>
          ))}
        </Select>

        {/* Tournament filter */}
        {periodTournaments.length > 0 && (
          <Select
            value={tournamentFilter}
            onChange={(e) => setTournamentFilter(e.target.value)} aria-label="Турнир" wrapperClassName="w-full sm:w-fit" className="sm:!w-auto sm:min-w-[9rem]">
            <option value="all">Все турниры</option>
            <option value="__none__">Без турнира</option>
            {periodTournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.date})</option>
            ))}
          </Select>
        )}

        {/* Sort order */}
        <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} aria-label="Порядок" wrapperClassName="w-full sm:w-fit" className="sm:!w-auto sm:min-w-[9rem]">
          <option value="date-desc">По дате ↓</option>
          <option value="date-asc">По дате ↑</option>
          <option value="number">По номеру</option>
        </Select>

        {filtered.length !== sourceGames.length && (
          <span className="text-sm text-stone-400 ml-1">
            {filtered.length} из {sourceGames.length}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Sword}
          title="Нет игр"
          description={sourceGames.length === 0
            ? (canAdd ? "Добавьте первую игру!" : "Пока нет игр")
            : "Нет игр по выбранным фильтрам"}
          action={isAdmin && canAdd && sourceGames.length === 0 ? (
            <Button icon={Plus} onClick={() => navigate("gameForm")}>
              Записать первую игру
            </Button>
          ) : null}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-4 py-3 text-sm font-medium text-stone-500">Игра</th>
                  <th className="hidden sm:table-cell text-left px-4 py-3 text-sm font-medium text-stone-500">Победитель</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-stone-500">MVP</th>
                  {seasonFilter === "all" && (
                    <th className="text-left px-4 py-3 text-sm font-medium text-stone-500">Сезон</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleGames.map((game) => {
                  const mvp = game.players.reduce((best, p) => (!best || p.totalScore > best.totalScore) ? p : best, null);
                  const mvpPlayer = mvp ? players.find((pl) => pl.id === mvp.playerId) : null;
                  const mine = meId && game.players.find((p) => p.playerId === meId);
                  return (
                    <tr key={game.id}
                      className={`border-b border-line last:border-b-0 hover:bg-elev-2 cursor-pointer transition-colors border-l-[3px] ${mine ? "bg-me" : ""} ${
                        game.winner === "red" ? "border-l-red-500" : game.winner === "draw" ? "border-l-amber-400" : "border-l-stone-600"
                      }`}
                      onClick={() => navigate("gameDetail", game.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-stone-100 text-sm font-medium font-data">{formatDate(game.date)}</span>
                          <span className="text-xs text-stone-500 font-data">#{game.gameNumber}</span>
                          {mine && (
                            <span
                              className={`text-[11px] font-semibold px-1.5 rounded ${mine.result === "win" ? "bg-emerald-500/15 text-emerald-300" : mine.result === "draw" ? "bg-amber-400/15 text-amber-300" : "bg-elev-3 text-stone-400"}`}
                              title="Ваш результат в этой игре"
                            >
                              вы · {mine.result === "win" ? "победа" : mine.result === "draw" ? "ничья" : "поражение"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-0.5 min-w-0">
                          <span className={`sm:hidden font-medium ${game.winner === "red" ? "text-red-400" : game.winner === "draw" ? "text-amber-400" : "text-stone-300"}`}>
                            {TEAM_NAMES[game.winner]}
                          </span>
                          {getTournamentName(game.tournamentId) && (
                            <>
                              <span className="sm:hidden" aria-hidden="true">·</span>
                              <span className="truncate max-w-[220px]">{getTournamentName(game.tournamentId)}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3">
                        <Badge variant={game.winner === "red" ? "red" : game.winner === "draw" ? "yellow" : "black"}>
                          {TEAM_NAMES[game.winner]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {mvpPlayer && (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm text-stone-100 truncate max-w-[120px] sm:max-w-none">{mvpPlayer.nickname}</span>
                            <span className="text-xs text-stone-500 font-data">{mvp.totalScore % 1 === 0 ? mvp.totalScore : mvp.totalScore.toFixed(1)}</span>
                          </div>
                        )}
                      </td>
                      {seasonFilter === "all" && (
                        <td className="px-4 py-3 text-stone-500 text-xs">{getSeasonName(game.seasonId)}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-stone-400">
            Показано {Math.min(visibleCount, filtered.length)} из {filtered.length}
          </span>
          {visibleCount < filtered.length && (
            <Button variant="secondary" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
              Показать ещё {Math.min(PAGE_SIZE, filtered.length - visibleCount)}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
