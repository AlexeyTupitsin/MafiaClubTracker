import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader } from "lucide-react";

import { getSeasons, getPlayers, getGamesBySeason, getAllGames, getTournamentsBySeason, getAllTournaments } from "./lib/queries";
import { Toast, EmptyState } from "./components/ui";
import { Sidebar } from "./components/layout/Sidebar";
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
import { TournamentList } from "./pages/TournamentList";
import { TournamentDetail } from "./pages/TournamentDetail";
import { TournamentForm } from "./pages/TournamentForm";

export default function App() {
  const { isAdmin } = useAuth();
  const [seasons, setSeasons] = useState([]);
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [allTournaments, setAllTournaments] = useState([]);
  const [currentSeasonId, setCurrentSeasonId] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);
  const [navStack, setNavStack] = useState([]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ message: msg, type });
  }, []);

  const navigate = useCallback((page, id = null) => {
    setNavStack(prev => {
      const entry = { page: currentPage, id: selectedId };
      const stack = [...prev, entry];
      return stack.slice(-10); // limit to 10 entries
    });
    setCurrentPage(page);
    setSelectedId(id);
  }, [currentPage, selectedId]);

  const goBack = useCallback(() => {
    if (navStack.length > 0) {
      const prev = navStack[navStack.length - 1];
      setNavStack(s => s.slice(0, -1));
      setCurrentPage(prev.page);
      setSelectedId(prev.id);
    } else {
      setCurrentPage("dashboard");
      setSelectedId(null);
    }
  }, [navStack]);

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
      const loadedTournaments = await getTournamentsBySeason(seasonId);
      setTournaments(loadedTournaments);
    } else {
      setGames([]);
      setTournaments([]);
    }
    const all = await getAllGames();
    setAllGames(all);
    const allT = await getAllTournaments();
    setAllTournaments(allT);
    setCurrentPage("dashboard");
  }, []);

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

        const active = loadedSeasons.find((s) => s.isActive);
        const seasonId = active?.id || loadedSeasons[loadedSeasons.length - 1]?.id;
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
    async function loadSeasonData() {
      const loaded = await getGamesBySeason(currentSeasonId);
      setGames(loaded);
      const loadedTournaments = await getTournamentsBySeason(currentSeasonId);
      setTournaments(loadedTournaments);
    }
    loadSeasonData();
  }, [currentSeasonId, loading]);

  const currentSeason = useMemo(
    () => seasons.find((s) => s.id === currentSeasonId),
    [seasons, currentSeasonId]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0908]">
        <div className="md:ml-[220px] max-w-6xl mx-auto px-4 py-6 pt-16 md:pt-6">
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
            tournaments={tournaments}
            refreshTournaments={refreshTournaments}
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
        setCurrentSeasonId={setCurrentSeasonId}
      />

      <main className="md:ml-[220px] max-w-6xl mx-auto px-4 py-6 pt-16 md:pt-6 animate-page-enter" key={currentPage + (selectedId || "")}>
        {renderPage()}
      </main>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
