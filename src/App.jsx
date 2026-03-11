import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader } from "lucide-react";

import { getSeasons, getPlayers, getGamesBySeason, getAllGames } from "./lib/queries";
import { Toast, EmptyState } from "./components/ui";
import { Header } from "./components/layout/Header";
import { TabBar } from "./components/layout/TabBar";
import { useAuth } from "./hooks/useAuth";
import { AdminOnly } from "./components/auth/AuthGuard";

import { Dashboard } from "./pages/Dashboard";
import { GameList } from "./pages/GameList";
import { GameDetail } from "./pages/GameDetail";
import { GameForm } from "./pages/GameForm";
import { Leaderboard } from "./pages/Leaderboard";
import { PlayerList } from "./pages/PlayerList";
import { PlayerProfile } from "./pages/PlayerProfile";
import { PlayerCompare } from "./pages/PlayerCompare";
import { SettingsPage } from "./pages/Settings";

export default function App() {
  const [seasons, setSeasons] = useState([]);
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [currentSeasonId, setCurrentSeasonId] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
  }, []);

  const navigate = useCallback((page, id = null) => {
    setCurrentPage(page);
    setSelectedId(id);
  }, []);

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

  // Full data refresh (used after import/reset/demo)
  const refreshData = useCallback(async () => {
    const loadedSeasons = await getSeasons();
    const loadedPlayers = await getPlayers();
    setSeasons(loadedSeasons);
    setPlayers(loadedPlayers);
    const active = loadedSeasons.find((s) => s.isActive);
    const seasonId = active?.id || loadedSeasons[loadedSeasons.length - 1]?.id;
    setCurrentSeasonId(seasonId);
    if (seasonId) {
      const loadedGames = await getGamesBySeason(seasonId);
      setGames(loadedGames);
    } else {
      setGames([]);
    }
    const all = await getAllGames();
    setAllGames(all);
    setCurrentPage("dashboard");
  }, []);

  // Load data on mount
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        let loadedSeasons = await getSeasons();
        const loadedPlayers = await getPlayers();

        if (cancelled) return;

        setSeasons(loadedSeasons);
        setPlayers(loadedPlayers);

        const active = loadedSeasons.find((s) => s.isActive);
        const seasonId = active?.id || loadedSeasons[loadedSeasons.length - 1]?.id;
        setCurrentSeasonId(seasonId);

        if (seasonId) {
          const loadedGames = await getGamesBySeason(seasonId);
          if (!cancelled) setGames(loadedGames);
        }

        const all = await getAllGames();
        if (!cancelled) setAllGames(all);
      } catch (error) {
        console.error("Failed to load data:", error);
        if (!cancelled) setLoadError(error?.message || String(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  // Reload games when season changes (after initial load)
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  useEffect(() => {
    if (loading) return;
    if (!initialLoadDone) {
      setInitialLoadDone(true);
      return;
    }
    if (!currentSeasonId) return;
    async function loadGames() {
      const loaded = await getGamesBySeason(currentSeasonId);
      setGames(loaded);
    }
    loadGames();
  }, [currentSeasonId, loading]);

  const currentSeason = useMemo(
    () => seasons.find((s) => s.id === currentSeasonId),
    [seasons, currentSeasonId]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader size={20} className="animate-spin" />
            Загрузка...
          </div>
          {loadError && (
            <div className="mt-4 max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              <p className="font-medium mb-1">Ошибка загрузки данных:</p>
              <p className="font-mono text-xs">{loadError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderPage = () => {
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
            editingGame={selectedId ? games.find((g) => g.id === selectedId) : null}
            showToast={showToast}
            refreshGames={refreshGames}
            refreshAllGames={refreshAllGames}
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
          />
        );
      case "players":
        return (
          <PlayerList
            players={players}
            games={games}
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
          />
        );
      case "settings":
        return (
          <SettingsPage
            seasons={seasons}
            games={games}
            players={players}
            currentSeasonId={currentSeasonId}
            setCurrentSeasonId={setCurrentSeasonId}
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
    <div className="min-h-screen bg-gray-50 pb-16 sm:pb-0">
      <Header
        seasons={seasons}
        currentSeasonId={currentSeasonId}
        setCurrentSeasonId={setCurrentSeasonId}
      />
      <TabBar currentPage={currentPage} navigate={navigate} />

      <main className="max-w-4xl mx-auto px-4 py-6" key={currentPage + (selectedId || "")}>
        {renderPage()}
      </main>

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}
