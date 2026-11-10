import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { SeasonsSection } from "./settings/SeasonsSection";
import { DataSection } from "./settings/DataSection";

export function SettingsPage({
  seasons, currentSeasonId, setCurrentSeasonId,
  showToast, refreshData,
  refreshSeasons, refreshPlayers, refreshAllGames,
}) {
  // Ошибка действий над сезонами (завершить, удалить) — над списком сезонов.
  // Ошибки раздела «Данные» показываются в его строках.
  const [error, setError] = useState("");

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <p className="eyebrow">Для ведущих</p>
        <h2 className="page-title mt-1.5">Настройки</h2>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 flex items-start gap-2.5 text-sm text-red-300">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          <p className="flex-1">{error}</p>
          <button type="button" aria-label="Скрыть ошибку" onClick={() => setError("")}
            className="btn-ghost btn-icon !w-8 !h-8 -m-1 text-red-300 cursor-pointer">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <SeasonsSection
        seasons={seasons}
        currentSeasonId={currentSeasonId}
        setCurrentSeasonId={setCurrentSeasonId}
        refreshSeasons={refreshSeasons}
        showToast={showToast}
        onError={setError}
      />

      <DataSection
        showToast={showToast}
        refreshData={refreshData}
        refreshAllGames={refreshAllGames}
        refreshPlayers={refreshPlayers}
      />
    </div>
  );
}
