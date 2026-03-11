import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader } from "lucide-react";

import { safeGet, safeSet } from "./lib/storage";
import { generateId } from "./lib/utils";
import { Toast } from "./components/ui";
import { Header } from "./components/layout/Header";
import { TabBar } from "./components/layout/TabBar";

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
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
  }, []);

  const navigate = useCallback((page, id = null) => {
    setCurrentPage(page);
    setSelectedId(id);
  }, []);

  const savePlayers = useCallback(async (data) => {
    await safeSet("players", data);
  }, []);

  const saveSeasons = useCallback(async (data) => {
    await safeSet("seasons", data);
  }, []);

  const saveGames = useCallback(async (data) => {
    setGames(data);
    await safeSet(`games:${currentSeasonId}`, data);
    setAllGames((prev) => {
      const otherGames = prev.filter((g) => !data.some((d) => d.id === g.id) && g.seasonId !== currentSeasonId);
      return [...otherGames, ...data];
    });
  }, [currentSeasonId]);

  // Load data on mount
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        let loadedSeasons = await safeGet("seasons", []);
        const loadedPlayers = await safeGet("players", []);

        if (loadedSeasons.length === 0) {
          const firstSeason = {
            id: generateId(),
            name: "Сезон 1",
            startDate: new Date().toISOString().split("T")[0],
            endDate: null,
            isActive: true,
          };
          loadedSeasons = [firstSeason];
          await safeSet("seasons", loadedSeasons);
        }

        if (cancelled) return;

        setSeasons(loadedSeasons);
        setPlayers(loadedPlayers);

        const active = loadedSeasons.find((s) => s.isActive);
        const seasonId = active?.id || loadedSeasons[loadedSeasons.length - 1]?.id;
        setCurrentSeasonId(seasonId);

        if (seasonId) {
          const loadedGames = await safeGet(`games:${seasonId}`, []);
          if (!cancelled) setGames(loadedGames);
        }

        const all = [];
        for (const s of loadedSeasons) {
          const sg = await safeGet(`games:${s.id}`, []);
          all.push(...sg);
        }
        if (!cancelled) setAllGames(all);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  // Reload all data (used after import)
  const reloadData = useCallback(async () => {
    const loadedSeasons = await safeGet("seasons", []);
    const loadedPlayers = await safeGet("players", []);
    setSeasons(loadedSeasons);
    setPlayers(loadedPlayers);
    const active = loadedSeasons.find((s) => s.isActive);
    const seasonId = active?.id || loadedSeasons[loadedSeasons.length - 1]?.id;
    setCurrentSeasonId(seasonId);
    if (seasonId) {
      const loadedGames = await safeGet(`games:${seasonId}`, []);
      setGames(loadedGames);
    } else {
      setGames([]);
    }
    const all = [];
    for (const s of loadedSeasons) {
      const sg = await safeGet(`games:${s.id}`, []);
      all.push(...sg);
    }
    setAllGames(all);
    setCurrentPage("dashboard");
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
      const loaded = await safeGet(`games:${currentSeasonId}`, []);
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
        <div className="flex items-center gap-2 text-gray-500">
          <Loader size={20} className="animate-spin" />
          Загрузка...
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
            saveGames={saveGames}
            games={games}
            currentSeason={currentSeason}
            showToast={showToast}
          />
        );
      case "gameForm":
        return (
          <GameForm
            players={players}
            games={games}
            currentSeasonId={currentSeasonId}
            currentSeason={currentSeason}
            saveGames={saveGames}
            navigate={navigate}
            editingGame={selectedId ? games.find((g) => g.id === selectedId) : null}
            showToast={showToast}
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
          />
        );
      case "players":
        return (
          <PlayerList
            players={players}
            setPlayers={setPlayers}
            games={games}
            savePlayers={savePlayers}
            navigate={navigate}
            showToast={showToast}
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
            setSeasons={setSeasons}
            saveSeasons={saveSeasons}
            games={games}
            setGames={setGames}
            players={players}
            setPlayers={setPlayers}
            savePlayers={savePlayers}
            currentSeasonId={currentSeasonId}
            setCurrentSeasonId={setCurrentSeasonId}
            showToast={showToast}
            reloadData={reloadData}
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
