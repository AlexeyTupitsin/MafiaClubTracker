import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { WifiOff } from "lucide-react";

import { getSeasons, getPlayers, getGamesBySeason, getAllGames, getTournamentsBySeason, getAllTournaments } from "./lib/queries";
import { Toast, EmptyState } from "./components/ui";
import { Sidebar } from "./components/layout/Sidebar";
import { useAuth } from "./hooks/useAuth";
import { AdminOnly } from "./components/auth/AuthGuard";
import { hashToRoute, routeToHash } from "./lib/router";
import { readDataCache, writeDataCache, pickDefaultSeasonId, seasonSlice } from "./lib/dataCache";

import { Dashboard } from "./pages/Dashboard";

// Дашборд — в основном бандле (его видят все при открытии), остальные страницы
// подгружаются при первом переходе.
const lazyPage = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const GameList = lazyPage(() => import("./pages/GameList"), "GameList");
const GameDetail = lazyPage(() => import("./pages/GameDetail"), "GameDetail");
const GameForm = lazyPage(() => import("./pages/GameForm"), "GameForm");
const Leaderboard = lazyPage(() => import("./pages/Leaderboard"), "Leaderboard");
const PlayerList = lazyPage(() => import("./pages/PlayerList"), "PlayerList");
const PlayerProfile = lazyPage(() => import("./pages/PlayerProfile"), "PlayerProfile");
const PlayerCompare = lazyPage(() => import("./pages/PlayerCompare"), "PlayerCompare");
const SettingsPage = lazyPage(() => import("./pages/Settings"), "SettingsPage");
const TournamentList = lazyPage(() => import("./pages/TournamentList"), "TournamentList");
const TournamentDetail = lazyPage(() => import("./pages/TournamentDetail"), "TournamentDetail");
const TournamentForm = lazyPage(() => import("./pages/TournamentForm"), "TournamentForm");

// Страницы, где устаревшие данные опасны (номер новой игры, импорт, сезоны):
// открываются только после загрузки свежих данных с сервера.
const FRESH_DATA_PAGES = new Set(["gameForm", "tournamentForm", "settings"]);

function SkeletonBlocks() {
  return (
    <>
      {/* Skeleton stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-4 bg-indigo-500/10 rounded w-20 mb-3" />
            <div className="h-8 bg-indigo-500/10 rounded w-16" />
          </div>
        ))}
      </div>
      {/* Skeleton table */}
      <div className="glass-card p-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-4 py-3 border-b border-indigo-500/5 last:border-0 animate-pulse">
            <div className="h-4 bg-indigo-500/10 rounded w-8" />
            <div className="h-4 bg-indigo-500/10 rounded w-24" />
            <div className="h-4 bg-indigo-500/10 rounded w-12" />
            <div className="h-4 bg-indigo-500/10 rounded w-12" />
            <div className="h-4 bg-indigo-500/10 rounded w-16" />
          </div>
        ))}
      </div>
    </>
  );
}

export default function App() {
  const { isAdmin } = useAuth();
  // Сохранённые данные прошлого визита: показываем сразу, свежие грузятся в фоне
  const [cached] = useState(() => {
    const cache = readDataCache();
    if (!cache) return null;
    const seasonId = pickDefaultSeasonId(cache.seasons);
    return { ...cache, seasonId, ...seasonSlice(cache, seasonId) };
  });
  const [seasons, setSeasons] = useState(cached?.seasons ?? []);
  const [players, setPlayers] = useState(cached?.players ?? []);
  const [games, setGames] = useState(cached?.games ?? []);
  const [allGames, setAllGames] = useState(cached?.allGames ?? []);
  const [tournaments, setTournaments] = useState(cached?.tournaments ?? []);
  const [allTournaments, setAllTournaments] = useState(cached?.allTournaments ?? []);
  const [currentSeasonId, setCurrentSeasonId] = useState(cached?.seasonId ?? null);
  const [route, setRoute] = useState(() => hashToRoute(window.location.hash));
  const [loading, setLoading] = useState(!cached);
  const [loadError, setLoadError] = useState(null);
  // pending — ждём сервер, fresh — данные свежие, failed — показан только кэш
  const [freshState, setFreshState] = useState("pending");

  // Сезон, выбранный пользователем, пока шла фоновая загрузка, не перетираем
  const seasonTouchedRef = useRef(false);
  const currentSeasonIdRef = useRef(currentSeasonId);
  // Сезон, чьи игры и турниры уже лежат в state — повторно не запрашиваем
  const loadedSeasonRef = useRef(cached?.seasonId ?? null);
  useEffect(() => { currentSeasonIdRef.current = currentSeasonId; }, [currentSeasonId]);

  const selectSeason = useCallback((id) => {
    seasonTouchedRef.current = true;
    setCurrentSeasonId(id);
  }, []);
  const [toast, setToast] = useState(null);
  const { page: currentPage, id: selectedId } = route;

  const showToast = useCallback((msg, type = "success") => {
    setToast({ message: msg, type });
  }, []);

  // Навигация живёт в истории браузера: работают свайп/кнопка «назад»,
  // F5 и ссылки на конкретную страницу. depth в history.state — сколько
  // наших записей позади, чтобы goBack не уводил с сайта.
  useEffect(() => {
    const depth = window.history.state?.depth ?? 0;
    const { page, id } = hashToRoute(window.location.hash);
    window.history.replaceState({ depth }, "", routeToHash(page, id));

    const onPopState = () => setRoute(hashToRoute(window.location.hash));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // replace: заменить текущую запись (после сохранения/удаления, чтобы
  // «назад» не возвращал в уже закрытую форму)
  const navigate = useCallback((page, id = null, { replace = false } = {}) => {
    const hash = routeToHash(page, id);
    const depth = window.history.state?.depth ?? 0;
    if (replace || hash === window.location.hash) {
      window.history.replaceState({ depth }, "", hash);
    } else {
      window.history.pushState({ depth: depth + 1 }, "", hash);
    }
    setRoute({ page, id });
  }, []);

  const goBack = useCallback(() => {
    if ((window.history.state?.depth ?? 0) > 0) {
      window.history.back();
    } else {
      navigate("dashboard", null, { replace: true });
    }
  }, [navigate]);

  // Refresh individual data sets from Supabase
  const refreshSeasons = useCallback(async () => {
    const data = await getSeasons();
    setSeasons(data);
    return data;
  }, []);

  const refreshPlayers = useCallback(async () => {
    const data = await getPlayers();
    setPlayers(data);
    return data;
  }, []);

  const refreshGames = useCallback(async (seasonId) => {
    const sid = seasonId || currentSeasonId;
    if (!sid) return [];
    const data = await getGamesBySeason(sid);
    setGames(data);
    return data;
  }, [currentSeasonId]);

  const refreshAllGames = useCallback(async () => {
    const data = await getAllGames();
    setAllGames(data);
    return data;
  }, []);

  const refreshTournaments = useCallback(async (seasonId) => {
    const sid = seasonId || currentSeasonId;
    if (!sid) return [];
    const data = await getTournamentsBySeason(sid);
    setTournaments(data);
    return data;
  }, [currentSeasonId]);

  const refreshAllTournaments = useCallback(async () => {
    const data = await getAllTournaments();
    setAllTournaments(data);
    return data;
  }, []);

  // Full data refresh (used after import/reset/demo)
  const refreshData = useCallback(async () => {
    const [loadedSeasons, loadedPlayers] = await Promise.all([getSeasons(), getPlayers()]);
    const seasonId = pickDefaultSeasonId(loadedSeasons);
    const [seasonGames, seasonTournaments, all, allT] = await Promise.all([
      seasonId ? getGamesBySeason(seasonId) : [],
      seasonId ? getTournamentsBySeason(seasonId) : [],
      getAllGames(),
      getAllTournaments(),
    ]);
    seasonTouchedRef.current = false;
    loadedSeasonRef.current = seasonId;
    setSeasons(loadedSeasons);
    setPlayers(loadedPlayers);
    setCurrentSeasonId(seasonId);
    setGames(seasonGames);
    setTournaments(seasonTournaments);
    setAllGames(all);
    setAllTournaments(allT);
    navigate("dashboard", null, { replace: true });
  }, [navigate]);

  // Load data on mount
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        // Wave 1: independent calls
        const [loadedSeasons, loadedPlayers] = await Promise.all([
          getSeasons(),
          getPlayers(),
        ]);
        if (cancelled) return;
        setSeasons(loadedSeasons);
        setPlayers(loadedPlayers);

        const touchedId = currentSeasonIdRef.current;
        const seasonId = seasonTouchedRef.current && loadedSeasons.some((s) => s.id === touchedId)
          ? touchedId
          : pickDefaultSeasonId(loadedSeasons);
        loadedSeasonRef.current = seasonId; // игры этого сезона грузятся ниже
        setCurrentSeasonId(seasonId);

        // Wave 2: all parallel
        const promises = [getAllGames(), getAllTournaments()];
        if (seasonId) {
          promises.unshift(getGamesBySeason(seasonId), getTournamentsBySeason(seasonId));
        }

        const results = await Promise.all(promises);
        if (cancelled) return;

        let i = 0;
        if (seasonId) {
          setGames(results[i++]);
          setTournaments(results[i++]);
        }
        setAllGames(results[i++]);
        setAllTournaments(results[i++]);
        setFreshState("fresh");
      } catch (error) {
        console.error("Failed to load data:", error);
        if (cancelled) return;
        setFreshState("failed");
        if (cached) showToast("Не удалось обновить данные, показаны сохранённые", "error");
        else setLoadError(error?.message || String(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [cached, showToast]); // обе зависимости стабильны — загрузка один раз при старте

  // Свежие данные — в кэш для следующего открытия
  useEffect(() => {
    if (freshState !== "fresh") return;
    const timer = setTimeout(() => writeDataCache({ seasons, players, allGames, allTournaments }), 300);
    return () => clearTimeout(timer);
  }, [freshState, seasons, players, allGames, allTournaments]);

  // Смена сезона пользователем — подгружаем его игры и турниры
  useEffect(() => {
    if (loading || !currentSeasonId || currentSeasonId === loadedSeasonRef.current) return;
    let cancelled = false;
    Promise.all([getGamesBySeason(currentSeasonId), getTournamentsBySeason(currentSeasonId)])
      .then(([loaded, loadedTournaments]) => {
        if (cancelled) return;
        loadedSeasonRef.current = currentSeasonId;
        setGames(loaded);
        setTournaments(loadedTournaments);
      })
      .catch((error) => {
        console.error("Failed to load season data:", error);
        if (!cancelled) showToast("Не удалось загрузить данные сезона", "error");
      });
    return () => { cancelled = true; };
  }, [currentSeasonId, loading, showToast]);

  const currentSeason = useMemo(
    () => seasons.find((s) => s.id === currentSeasonId),
    [seasons, currentSeasonId]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0908]">
        <div className="md:ml-[220px] max-w-6xl mx-auto px-4 py-6 pt-16 md:pt-6">
          <SkeletonBlocks />
          {loadError && (
            <div className="mt-4 max-w-md mx-auto bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
              <p className="font-medium mb-1">Ошибка загрузки данных:</p>
              <p className="font-mono text-xs">{loadError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderPage = () => {
    if (FRESH_DATA_PAGES.has(currentPage) && freshState !== "fresh") {
      if (freshState === "pending") return <SkeletonBlocks />;
      return (
        <EmptyState
          icon={WifiOff}
          title="Нет связи с сервером"
          description="Эта страница открывается только со свежими данными. Проверьте интернет и обновите страницу."
          action={
            <button onClick={() => window.location.reload()}
              className="btn-ghost px-4 py-2 text-sm cursor-pointer">
              Обновить
            </button>
          }
        />
      );
    }

    switch (currentPage) {
      case "dashboard":
        return (
          <Dashboard
            games={games}
            players={players}
            navigate={navigate}
            currentSeason={currentSeason}
            seasons={seasons}
            currentSeasonId={currentSeasonId}
            allGames={allGames}
            showToast={showToast}
          />
        );
      case "games":
        return (
          <GameList
            games={games}
            players={players}
            navigate={navigate}
            currentSeason={currentSeason}
            seasons={seasons}
            currentSeasonId={currentSeasonId}
            allGames={allGames}
            tournaments={tournaments}
          />
        );
      case "gameDetail":
        return (
          <GameDetail
            game={games.find((g) => g.id === selectedId) || allGames.find((g) => g.id === selectedId)}
            players={players}
            navigate={navigate}
            games={games}
            currentSeason={currentSeason}
            showToast={showToast}
            refreshGames={refreshGames}
            refreshAllGames={refreshAllGames}
            tournaments={tournaments}
            goBack={goBack}
          />
        );
      case "gameForm":
        return (
          <GameForm
            players={players}
            games={games}
            currentSeasonId={currentSeasonId}
            currentSeason={currentSeason}
            navigate={navigate}
            editingGame={selectedId ? (games.find((g) => g.id === selectedId) || allGames.find((g) => g.id === selectedId)) : null}
            showToast={showToast}
            refreshGames={refreshGames}
            refreshAllGames={refreshAllGames}
            tournaments={tournaments}
            refreshTournaments={refreshTournaments}
          />
        );
      case "rating":
        return (
          <Leaderboard
            games={games}
            players={players}
            seasons={seasons}
            currentSeasonId={currentSeasonId}
            navigate={navigate}
            allGames={allGames}
            tournaments={tournaments}
            showToast={showToast}
          />
        );
      case "tournaments":
        return (
          <TournamentList
            allTournaments={allTournaments}
            allGames={allGames}
            seasons={seasons}
            players={players}
            navigate={navigate}
          />
        );
      case "tournamentDetail":
        return (
          <TournamentDetail
            tournament={allTournaments.find((t) => t.id === selectedId)}
            allGames={allGames}
            players={players}
            navigate={navigate}
            seasons={seasons}
            goBack={goBack}
            showToast={showToast}
            refreshTournaments={refreshTournaments}
            refreshAllTournaments={refreshAllTournaments}
          />
        );
      case "tournamentForm":
        return (
          <TournamentForm
            seasons={seasons}
            currentSeasonId={currentSeasonId}
            navigate={navigate}
            goBack={goBack}
            editingTournament={selectedId ? allTournaments.find((t) => t.id === selectedId) : null}
            showToast={showToast}
            refreshTournaments={refreshTournaments}
            refreshAllTournaments={refreshAllTournaments}
          />
        );
      case "players":
        return (
          <PlayerList
            players={players}
            games={games}
            allGames={allGames}
            navigate={navigate}
            showToast={showToast}
            refreshPlayers={refreshPlayers}
          />
        );
      case "playerProfile":
        return (
          <PlayerProfile
            player={players.find((p) => p.id === selectedId)}
            games={games}
            players={players}
            navigate={navigate}
            seasons={seasons}
            currentSeasonId={currentSeasonId}
            allGames={allGames}
            tournaments={tournaments}
            goBack={goBack}
          />
        );
      case "compare":
        return (
          <PlayerCompare
            players={players}
            allGames={allGames}
            games={games}
            seasons={seasons}
            currentSeasonId={currentSeasonId}
            navigate={navigate}
            preselectedId={selectedId}
            goBack={goBack}
          />
        );
      case "settings":
        if (!isAdmin) return <Dashboard games={games} players={players} navigate={navigate} currentSeason={currentSeason} seasons={seasons} currentSeasonId={currentSeasonId} allGames={allGames} />;
        return (
          <SettingsPage
            seasons={seasons}
            currentSeasonId={currentSeasonId}
            setCurrentSeasonId={selectSeason}
            showToast={showToast}
            refreshData={refreshData}
            refreshSeasons={refreshSeasons}
            refreshGames={refreshGames}
            refreshPlayers={refreshPlayers}
            refreshAllGames={refreshAllGames}
          />
        );
      default:
        return (
          <Dashboard
            games={games}
            players={players}
            navigate={navigate}
            currentSeason={currentSeason}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0908] pb-16 md:pb-0">
      <Sidebar
        currentPage={currentPage}
        navigate={navigate}
        seasons={seasons}
        currentSeasonId={currentSeasonId}
        setCurrentSeasonId={selectSeason}
      />

      <main className="md:ml-[220px] max-w-6xl mx-auto px-4 py-6 pt-16 md:pt-6 animate-page-enter" key={currentPage + (selectedId || "")}>
        <Suspense fallback={<SkeletonBlocks />}>
          {renderPage()}
        </Suspense>
      </main>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
