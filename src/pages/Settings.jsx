import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { SeasonsSection } from "./settings/SeasonsSection";
import { DataSection } from "./settings/DataSection";

export function SettingsPage({
  seasons, currentSeasonId, setCurrentSeasonId,
  showToast, refreshData,
  refreshSeasons, refreshGames, refreshPlayers, refreshAllGames,
}) {
  // Общая плашка ошибки для всех разделов
  const [error, setError] = useState("");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold gradient-text">Настройки</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError("")} className="ml-auto p-0.5 hover:bg-red-500/20 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      <SeasonsSection
        seasons={seasons}
        currentSeasonId={currentSeasonId}
        setCurrentSeasonId={setCurrentSeasonId}
        refreshSeasons={refreshSeasons}
        refreshGames={refreshGames}
        showToast={showToast}
        onError={setError}
      />

      <DataSection
        showToast={showToast}
        onError={setError}
        refreshData={refreshData}
        refreshGames={refreshGames}
        refreshAllGames={refreshAllGames}
        refreshPlayers={refreshPlayers}
      />
    </div>
  );
}
