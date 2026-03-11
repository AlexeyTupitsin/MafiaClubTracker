import { useState } from "react";
import {
  Plus,
  Trash2,
  X,
  AlertTriangle,
  Download,
  Upload,
  Database,
  RefreshCw,
  CheckCircle,
  Pencil,
  Check,
} from "lucide-react";
import { Modal, ConfirmDialog, Badge } from "../components/ui";
import { getTeam, formatDate } from "../lib/utils";
import {
  createSeason,
  updateSeason,
  deleteSeason,
  getGameCountBySeason,
  createPlayer,
  createGame,
  createTournament,
  exportAllData,
  importData,
  resetAllData,
} from "../lib/queries";

export function SettingsPage({
  seasons, games, players,
  currentSeasonId, setCurrentSeasonId,
  showToast, refreshData,
  refreshSeasons, refreshGames, refreshPlayers, refreshAllGames,
  tournaments, refreshTournaments,
}) {
  const [showNewSeason, setShowNewSeason] = useState(false);
  const [seasonName, setSeasonName] = useState("");
  const [seasonStart, setSeasonStart] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [error, setError] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetWord, setResetWord] = useState("");
  const [confirmImport, setConfirmImport] = useState(null);
  const [editingSeasonId, setEditingSeasonId] = useState(null);
  const [editingSeasonName, setEditingSeasonName] = useState("");

  // --- Season handlers ---
  const handleCreateSeason = async () => {
    const trimmed = seasonName.trim();
    if (!trimmed) { setError("Введите название сезона"); return; }

    try {
      const newSeason = await createSeason({
        name: trimmed,
        startDate: seasonStart,
        endDate: null,
        isActive: true,
      });
      await refreshSeasons();
      setCurrentSeasonId(newSeason.id);
      await refreshGames(newSeason.id);
      setShowNewSeason(false);
      setSeasonName("");
      setError("");
      showToast("Сезон создан");
    } catch (err) {
      setError(err.message || "Ошибка создания сезона");
    }
  };

  const handleEndSeason = async (season) => {
    try {
      await updateSeason(season.id, {
        isActive: false,
        endDate: new Date().toISOString().split("T")[0],
      });
      await refreshSeasons();
      setConfirmEnd(null);
      showToast("Сезон завершён");
    } catch (err) {
      setError(err.message || "Ошибка завершения сезона");
    }
  };

  const handleDeleteSeason = async (season) => {
    try {
      const gameCount = await getGameCountBySeason(season.id);
      if (gameCount > 0) {
        setError("Нельзя удалить сезон с играми");
        setConfirmDelete(null);
        return;
      }
      await deleteSeason(season.id);
      const updatedSeasons = await refreshSeasons();
      if (currentSeasonId === season.id) {
        const fallback = updatedSeasons.find((s) => s.isActive) || updatedSeasons[updatedSeasons.length - 1];
        if (fallback) {
          setCurrentSeasonId(fallback.id);
          await refreshGames(fallback.id);
        }
      }
      setConfirmDelete(null);
      setError("");
      showToast("Сезон удалён");
    } catch (err) {
      setError(err.message || "Ошибка удаления сезона");
    }
  };

  const handleRenameSeason = async (id) => {
    const trimmed = editingSeasonName.trim();
    if (!trimmed) return;
    try {
      await updateSeason(id, { name: trimmed });
      await refreshSeasons();
      setEditingSeasonId(null);
      showToast("Сезон переименован");
    } catch (err) {
      setError(err.message || "Ошибка переименования");
    }
  };

  // --- Demo data ---
  const generateDemoData = async () => {
    const demoNicknames = [
      { nickname: "Волк", realName: "Алексей" },
      { nickname: "Лиса", realName: "Мария" },
      { nickname: "Сокол", realName: "Дмитрий" },
      { nickname: "Тень", realName: "Елена" },
      { nickname: "Шторм", realName: "Игорь" },
      { nickname: "Кобра", realName: "Ольга" },
      { nickname: "Ворон", realName: "Сергей" },
      { nickname: "Пантера", realName: "Анна" },
      { nickname: "Гром", realName: "Павел" },
      { nickname: "Рысь", realName: "Наталья" },
      { nickname: "Феникс", realName: "Виктор" },
      { nickname: "Ягуар", realName: "Светлана" },
    ];

    try {
      // Create missing players
      const newPlayers = demoNicknames.filter(
        (d) => !players.some((p) => p.nickname.toLowerCase() === d.nickname.toLowerCase())
      );
      for (const np of newPlayers) {
        await createPlayer({ nickname: np.nickname, realName: np.realName, isActive: true });
      }

      // Refresh players to get IDs
      const allPlayers = await refreshPlayers();
      const activePlayers = allPlayers.filter((p) => p.isActive);

      if (activePlayers.length < 10) {
        setError("Нужно минимум 10 активных игроков для генерации игр");
        setConfirmDemo(false);
        return;
      }

      const roleSet = [
        "citizen", "citizen", "citizen", "citizen", "citizen", "citizen",
        "sheriff", "mafia", "mafia", "don",
      ];
      const maxGameNum = games.reduce((max, g) => Math.max(max, g.gameNumber), 0);
      const numGames = Math.min(10, Math.floor(activePlayers.length / 10) * 5);

      // Create demo tournaments (group games into evenings)
      const demoTournaments = [];
      const tournamentsToCreate = Math.max(1, Math.ceil(numGames / 3));
      for (let t = 0; t < tournamentsToCreate; t++) {
        const tournamentDate = new Date(Date.now() - (tournamentsToCreate - 1 - t) * 7 * 86400000);
        const tournament = await createTournament({
          seasonId: currentSeasonId,
          name: `Вечер ${t + 1}`,
          date: tournamentDate.toISOString().split("T")[0],
        });
        demoTournaments.push(tournament);
      }

      for (let i = 0; i < numGames; i++) {
        const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5).slice(0, 10);
        const shuffledRoles = [...roleSet].sort(() => Math.random() - 0.5);
        const winner = Math.random() > 0.45 ? "red" : "black";

        // Assign game to a tournament
        const tournamentIdx = Math.min(Math.floor(i / 3), demoTournaments.length - 1);
        const tournament = demoTournaments[tournamentIdx];

        const gamePlayers = shuffledPlayers.map((player, idx) => {
          const role = shuffledRoles[idx];
          const team = getTeam(role);
          const result = team === winner ? "win" : "lose";
          const baseScore = result === "win" ? 1 : 0;
          const bonusScore = Math.random() > 0.7
            ? parseFloat((Math.random() * 1 - 0.5).toFixed(1)) : 0;
          return {
            playerId: player.id,
            seat: idx + 1,
            role,
            result,
            baseScore,
            bonusScore,
            bonusComment: bonusScore > 0 ? "Лучший ход" : bonusScore < 0 ? "Фол" : null,
            totalScore: baseScore + bonusScore,
          };
        });

        await createGame({
          seasonId: currentSeasonId,
          tournamentId: tournament.id,
          gameNumber: maxGameNum + i + 1,
          date: new Date(Date.now() - (numGames - 1 - i) * 86400000).toISOString(),
          winner,
          players: gamePlayers,
          notes: null,
        });
      }

      await refreshGames();
      await refreshAllGames();
      await refreshTournaments?.();
      setConfirmDemo(false);
      setError("");
      showToast(`Создано ${newPlayers.length} игроков и ${numGames} игр`);
    } catch (err) {
      setError(err.message || "Ошибка генерации демо-данных");
    }
  };

  // --- Export ---
  const [exportData, setExportData] = useState(null);

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      setExportData(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err.message || "Ошибка экспорта");
    }
  };

  const handleCopyExport = () => {
    if (!exportData) return;
    navigator.clipboard.writeText(exportData).then(() => {
      showToast("Скопировано в буфер обмена");
    }).catch(() => {
      showToast("Не удалось скопировать — выделите текст вручную");
    });
  };

  const handleDownloadExport = () => {
    if (!exportData) return;
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mafia-club-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Import ---
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.seasons || !data.players || !data.games) {
          setError("Некорректный формат файла: отсутствуют seasons, players или games");
          return;
        }
        setConfirmImport(data);
      } catch {
        setError("Ошибка чтения файла: некорректный JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportConfirm = async () => {
    try {
      await importData(confirmImport);
      setConfirmImport(null);
      await refreshData();
      showToast("Данные импортированы");
    } catch (err) {
      console.error("Import error:", err);
      setConfirmImport(null);
      setError(err.message || "Ошибка импорта");
    }
  };

  // --- Reset ---
  const handleReset = async () => {
    try {
      const firstSeason = await resetAllData();
      await refreshData();
      setConfirmReset(false);
      setResetWord("");
      showToast("Все данные сброшены");
    } catch (err) {
      setError(err.message || "Ошибка сброса");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Настройки</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError("")} className="ml-auto p-0.5 hover:bg-red-100 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Seasons */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Сезоны</h3>
          <button onClick={() => { setShowNewSeason(true); setError(""); setSeasonName(""); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm">
            <Plus size={14} /> Новый сезон
          </button>
        </div>
        {seasons.length === 0 ? (
          <p className="text-gray-500 text-sm">Нет сезонов</p>
        ) : (
          <div className="space-y-2">
            {seasons.map((season) => (
              <div key={season.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  season.id === currentSeasonId ? "border-indigo-200 bg-indigo-50" : ""
                }`}>
                <div className="min-w-0">
                  {editingSeasonId === season.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingSeasonName}
                        onChange={(e) => setEditingSeasonName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRenameSeason(season.id); if (e.key === "Escape") setEditingSeasonId(null); }}
                        className="border rounded px-2 py-0.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button onClick={() => handleRenameSeason(season.id)}
                        className="p-1 hover:bg-green-100 rounded transition-colors" title="Сохранить">
                        <Check size={14} className="text-green-600" />
                      </button>
                      <button onClick={() => setEditingSeasonId(null)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors" title="Отмена">
                        <X size={14} className="text-gray-400" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="font-medium truncate">{season.name}</span>
                      <button onClick={() => { setEditingSeasonId(season.id); setEditingSeasonName(season.name); }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors" title="Переименовать">
                        <Pencil size={12} className="text-gray-400" />
                      </button>
                    </div>
                  )}
                  <div className="text-sm text-gray-500">
                    {formatDate(season.startDate)}
                    {season.endDate ? ` — ${formatDate(season.endDate)}` : " — ..."}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge variant={season.isActive ? "active" : "inactive"}>
                    {season.isActive ? "Активен" : "Завершён"}
                  </Badge>
                  {season.isActive && (
                    <button onClick={() => setConfirmEnd(season)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border rounded hover:bg-gray-50">
                      Завершить
                    </button>
                  )}
                  <button onClick={() => setConfirmDelete(season)}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Удалить">
                    <Trash2 size={14} className="text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export / Import */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-3">Данные</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">
            <Download size={16} /> Экспорт в JSON
          </button>
          <label className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm cursor-pointer">
            <Upload size={16} /> Импорт из JSON
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
        {exportData && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500">Скопируйте данные или скачайте файл:</span>
              <div className="flex gap-2">
                <button onClick={handleDownloadExport}
                  className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  <Download size={14} /> Скачать
                </button>
                <button onClick={handleCopyExport}
                  className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  <CheckCircle size={14} /> Копировать
                </button>
                <button onClick={() => setExportData(null)}
                  className="text-sm text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={exportData}
              rows={8}
              className="w-full border rounded-lg px-3 py-2 text-xs font-mono bg-gray-50 outline-none"
              onClick={(e) => e.target.select()}
            />
          </div>
        )}
      </div>

      {/* Demo Data */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-2">Демо-данные</h3>
        <p className="text-sm text-gray-500 mb-3">
          Создать тестовых игроков и игры для проверки работы приложения.
        </p>
        <button onClick={() => setConfirmDemo(true)}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm">
          <Database size={16} /> Сгенерировать демо-данные
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-red-100">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Опасная зона</h3>
        <p className="text-sm text-gray-500 mb-3">
          Удаление всех данных приложения. Это действие необратимо.
        </p>
        <button onClick={() => { setConfirmReset(true); setResetWord(""); }}
          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm">
          <RefreshCw size={16} /> Сбросить все данные
        </button>
      </div>

      {/* Modals */}
      {showNewSeason && (
        <Modal
          title="Новый сезон"
          onClose={() => setShowNewSeason(false)}
          footer={
            <>
              <button onClick={() => setShowNewSeason(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">Отмена</button>
              <button onClick={handleCreateSeason}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">Создать</button>
            </>
          }>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название <span className="text-red-500">*</span>
              </label>
              <input type="text" value={seasonName}
                onChange={(e) => setSeasonName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Сезон 2 — Лето 2026" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата начала</label>
              <input type="date" value={seasonStart}
                onChange={(e) => setSeasonStart(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            {seasons.some((s) => s.isActive) && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <AlertTriangle size={14} /> Текущий активный сезон будет автоматически завершён
              </p>
            )}
          </div>
        </Modal>
      )}

      {confirmEnd && (
        <ConfirmDialog title="Завершить сезон?"
          message={`Сезон «${confirmEnd.name}» будет завершён. Новые игры нельзя будет добавить в него.`}
          onConfirm={() => handleEndSeason(confirmEnd)}
          onCancel={() => setConfirmEnd(null)} confirmText="Завершить" />
      )}

      {confirmDelete && (
        <ConfirmDialog title="Удалить сезон?"
          message={`Сезон «${confirmDelete.name}» будет удалён. Это действие нельзя отменить.`}
          onConfirm={() => handleDeleteSeason(confirmDelete)}
          onCancel={() => setConfirmDelete(null)} confirmText="Удалить" danger />
      )}

      {confirmDemo && (
        <ConfirmDialog title="Сгенерировать демо-данные?"
          message="Будут созданы тестовые игроки и игры в текущем сезоне."
          onConfirm={generateDemoData}
          onCancel={() => setConfirmDemo(false)} confirmText="Сгенерировать" />
      )}

      {confirmImport && (
        <ConfirmDialog title="Импортировать данные?"
          message={`Импорт перезапишет ВСЕ текущие данные. В файле: ${confirmImport.seasons?.length || 0} сезонов, ${confirmImport.players?.length || 0} игроков. Продолжить?`}
          onConfirm={handleImportConfirm}
          onCancel={() => setConfirmImport(null)} confirmText="Импортировать" danger />
      )}

      {confirmReset && (
        <Modal title="Сбросить все данные?" onClose={() => setConfirmReset(false)}
          footer={
            <>
              <button onClick={() => setConfirmReset(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">Отмена</button>
              <button onClick={handleReset}
                disabled={resetWord !== "УДАЛИТЬ"}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm">
                Сбросить
              </button>
            </>
          }>
          <div className="space-y-3">
            <p className="text-gray-600">
              Все сезоны, игроки и игры будут удалены. Будет создан новый пустой «Сезон 1».
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Введите <span className="font-mono font-bold text-red-600">УДАЛИТЬ</span> для подтверждения
              </label>
              <input type="text" value={resetWord}
                onChange={(e) => setResetWord(e.target.value)}
                className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                placeholder="УДАЛИТЬ" autoFocus />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
