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
  Loader,
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
  const [editingSeason, setEditingSeason] = useState(null);
  const [editSeasonName, setEditSeasonName] = useState("");
  const [editThresholdType, setEditThresholdType] = useState("none");
  const [editThresholdValue, setEditThresholdValue] = useState("");
  const [editTrackFirstKill, setEditTrackFirstKill] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [trackFirstKill, setTrackFirstKill] = useState(true);
  const [thresholdType, setThresholdType] = useState("none");
  const [thresholdValue, setThresholdValue] = useState("");
  const [savingSeason, setSavingSeason] = useState(false);
  const [deletingSeason, setDeletingSeason] = useState(null);
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [resetting, setResetting] = useState(false);

  // --- Season handlers ---
  const isThresholdValid = (type, value) => {
    if (type === "none") return true;
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return false;
    if (type === "percent" && num > 100) return false;
    return true;
  };

  const handleCreateSeason = async () => {
    const trimmed = seasonName.trim();
    if (!trimmed) { setError("Введите название сезона"); return; }

    setSavingSeason(true);
    try {
      const newSeason = await createSeason({
        name: trimmed,
        startDate: seasonStart,
        endDate: null,
        isActive: true,
        trackFirstKill,
        ratingThresholdType: thresholdType,
        ratingThresholdValue: thresholdType === 'none' ? 0 : parseInt(thresholdValue, 10),
      });
      await refreshSeasons();
      setCurrentSeasonId(newSeason.id);
      await refreshGames(newSeason.id);
      setShowNewSeason(false);
      setSeasonName("");
      setThresholdType("none");
      setThresholdValue("");
      setError("");
      showToast("Сезон создан");
    } catch (err) {
      setError(err.message || "Ошибка создания сезона");
      showToast("Ошибка создания сезона: " + (err.message || "неизвестная ошибка"), "error");
    } finally {
      setSavingSeason(false);
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
    setDeletingSeason(season.id);
    try {
      const gameCount = await getGameCountBySeason(season.id);
      if (gameCount > 0) {
        setError("Нельзя удалить сезон с играми");
        showToast("Нельзя удалить сезон с играми", "error");
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
      showToast("Ошибка удаления сезона: " + (err.message || "неизвестная ошибка"), "error");
    } finally {
      setDeletingSeason(null);
    }
  };

  const openEditSeason = (season) => {
    setEditingSeason(season);
    setEditSeasonName(season.name);
    setEditThresholdType(season.ratingThresholdType || "none");
    setEditThresholdValue(
      season.ratingThresholdType !== "none" ? String(season.ratingThresholdValue || "") : ""
    );
    setEditTrackFirstKill(season.trackFirstKill ?? false);
  };

  const handleSaveEditSeason = async () => {
    if (!editingSeason) return;
    const trimmed = editSeasonName.trim();
    if (!trimmed) { setError("Введите название сезона"); return; }

    setSavingEdit(true);
    try {
      await updateSeason(editingSeason.id, {
        name: trimmed,
        trackFirstKill: editTrackFirstKill,
        ratingThresholdType: editThresholdType,
        ratingThresholdValue: editThresholdType === 'none' ? 0 : (parseInt(editThresholdValue, 10) || 0),
      });
      await refreshSeasons();
      setEditingSeason(null);
      showToast("Сезон обновлён");
    } catch (err) {
      setError(err.message || "Ошибка обновления сезона");
    } finally {
      setSavingEdit(false);
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

    setGeneratingDemo(true);
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
          const result = winner === "draw" ? "draw" : team === winner ? "win" : "lose";
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
      showToast("Ошибка генерации демо-данных: " + (err.message || "неизвестная ошибка"), "error");
    } finally {
      setGeneratingDemo(false);
    }
  };

  // --- Export ---
  const [exportData, setExportData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      setExportData(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err.message || "Ошибка экспорта");
      showToast("Ошибка экспорта: " + (err.message || "неизвестная ошибка"), "error");
    }
  };

  const handleCopyExport = () => {
    if (!exportData) return;
    navigator.clipboard.writeText(exportData).then(() => {
      showToast("Скопировано в буфер обмена");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      showToast("Не удалось скопировать — выделите текст вручную", "warning");
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
          const msg = "Некорректный формат файла: отсутствуют seasons, players или games";
          setError(msg);
          showToast(msg, "error");
          return;
        }
        setConfirmImport(data);
      } catch {
        const msg = "Ошибка чтения файла: некорректный JSON";
        setError(msg);
        showToast(msg, "error");
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
      showToast("Ошибка импорта: " + (err.message || "неизвестная ошибка"), "error");
    }
  };

  // --- Reset ---
  const handleReset = async () => {
    setResetting(true);
    try {
      const firstSeason = await resetAllData();
      await refreshData();
      setConfirmReset(false);
      setResetWord("");
      showToast("Все данные сброшены");
    } catch (err) {
      setError(err.message || "Ошибка сброса");
      showToast("Ошибка сброса: " + (err.message || "неизвестная ошибка"), "error");
    } finally {
      setResetting(false);
    }
  };

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

      {/* Seasons */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Сезоны</h3>
          <button onClick={() => { setShowNewSeason(true); setError(""); setSeasonName(""); }}
            className="flex items-center gap-2 btn-gradient cursor-pointer px-3 py-1.5 rounded-lg text-sm">
            <Plus size={14} /> Новый сезон
          </button>
        </div>
        {seasons.length === 0 ? (
          <p className="text-slate-400 text-sm">Нет сезонов</p>
        ) : (
          <div className="space-y-2">
            {seasons.map((season) => (
              <div key={season.id}
                className={`flex items-center justify-between p-3 border border-indigo-500/15 rounded-lg ${
                  season.id === currentSeasonId ? "border-indigo-500/30 bg-indigo-500/5" : ""
                }`}>
                <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium truncate">{season.name}</span>
                      <button onClick={() => openEditSeason(season)}
                        className="p-1 hover:bg-indigo-500/5 rounded transition-colors" title="Редактировать">
                        <Pencil size={12} className="text-slate-500" />
                      </button>
                    </div>
                  <div className="text-sm text-slate-400">
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
                      className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 border border-indigo-500/15 rounded hover:bg-indigo-500/5">
                      Завершить
                    </button>
                  )}
                  <button onClick={() => setConfirmDelete(season)}
                    className="p-1.5 hover:bg-indigo-500/5 rounded transition-colors" title="Удалить">
                    <Trash2 size={14} className="text-slate-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export / Import */}
      <div className="glass-card rounded-2xl p-4">
        <h3 className="text-lg font-semibold mb-3">Данные</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport}
            className="flex items-center gap-2 bg-slate-800/30 hover:bg-indigo-500/5 text-slate-300 px-4 py-2 rounded-lg text-sm">
            <Download size={16} /> Экспорт в JSON
          </button>
          <label className="flex items-center gap-2 bg-slate-800/30 hover:bg-indigo-500/5 text-slate-300 px-4 py-2 rounded-lg text-sm cursor-pointer">
            <Upload size={16} /> Импорт из JSON
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
        {exportData && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-400">Скопируйте данные или скачайте файл:</span>
              <div className="flex gap-2">
                <button onClick={handleDownloadExport}
                  className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium">
                  <Download size={14} /> Скачать
                </button>
                <button onClick={handleCopyExport}
                  className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium">
                  <CheckCircle size={14} /> {copied ? "Скопировано ✓" : "Копировать"}
                </button>
                <button onClick={() => setExportData(null)}
                  className="text-sm text-slate-500 hover:text-slate-300">
                  <X size={14} />
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={exportData}
              rows={8}
              className="w-full border border-indigo-500/15 rounded-lg px-3 py-2 text-xs font-mono bg-indigo-500/5 text-slate-300 outline-none"
              onClick={(e) => e.target.select()}
            />
          </div>
        )}
      </div>

      {/* Demo Data - hidden */}
      {/* <div className="glass-card rounded-2xl p-4">
        <h3 className="text-lg font-semibold mb-2">Демо-данные</h3>
        <p className="text-sm text-slate-400 mb-3">
          Создать тестовых игроков и игры для проверки работы приложения.
        </p>
        <button onClick={() => setConfirmDemo(true)}
          disabled={generatingDemo}
          className="flex items-center gap-2 bg-slate-800/30 hover:bg-indigo-500/5 disabled:bg-slate-800/30 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-300 px-4 py-2 rounded-lg text-sm">
          {generatingDemo ? <Loader size={16} className="animate-spin" /> : <Database size={16} />}
          {generatingDemo ? "Генерация..." : "Сгенерировать демо-данные"}
        </button>
      </div> */}

      {/* Danger Zone - hidden */}
      {/* <div className="glass-card border border-red-500/20 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-red-400 mb-2">Опасная зона</h3>
        <p className="text-sm text-slate-400 mb-3">
          Удаление всех данных приложения. Это действие необратимо.
        </p>
        <button onClick={() => { setConfirmReset(true); setResetWord(""); }}
          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm">
          <RefreshCw size={16} /> Сбросить все данные
        </button>
      </div> */}

      {/* Modals */}
      {showNewSeason && (
        <Modal
          title="Новый сезон"
          onClose={() => setShowNewSeason(false)}
          footer={
            <>
              <button onClick={() => setShowNewSeason(false)}
                disabled={savingSeason}
                className="px-4 py-2 btn-ghost cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed">Отмена</button>
              <button onClick={handleCreateSeason}
                disabled={savingSeason || !isThresholdValid(thresholdType, thresholdValue)}
                className="flex items-center gap-2 px-4 py-2 btn-gradient cursor-pointer disabled:bg-slate-800/30 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm">
                {savingSeason && <Loader size={14} className="animate-spin" />}
                {savingSeason ? "Создание..." : "Создать"}
              </button>
            </>
          }>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Название <span className="text-red-400">*</span>
              </label>
              <input type="text" value={seasonName}
                onChange={(e) => setSeasonName(e.target.value)}
                className="w-full bg-indigo-500/5 border border-indigo-500/15 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                placeholder="Сезон 2 — Лето 2026" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Дата начала</label>
              <input type="date" value={seasonStart}
                onChange={(e) => setSeasonStart(e.target.value)}
                className="w-full bg-indigo-500/5 border border-indigo-500/15 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="trackFirstKill"
                checked={trackFirstKill}
                onChange={(e) => setTrackFirstKill(e.target.checked)}
                className="rounded border-indigo-500/15 text-emerald-600 focus:ring-indigo-500/50"
              />
              <label htmlFor="trackFirstKill" className="text-sm text-slate-200">
                Отслеживать первоубиенного (ПУ)
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Порог рейтинга</label>
              <select
                value={thresholdType}
                onChange={(e) => {
                  setThresholdType(e.target.value);
                  if (e.target.value === "none") setThresholdValue("");
                  else if (!thresholdValue) setThresholdValue("1");
                }}
                className="w-full bg-indigo-500/5 border border-indigo-500/15 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
              >
                <option value="none">Без порога</option>
                <option value="absolute">Минимум игр</option>
                <option value="percent">Процент от игр сезона</option>
              </select>
            </div>
            {thresholdType !== "none" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {thresholdType === "absolute" ? "Минимальное количество игр" : "Процент от общего числа игр"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(e.target.value)}
                    min={1}
                    max={thresholdType === "percent" ? 100 : undefined}
                    placeholder={thresholdType === "absolute" ? "5" : "50"}
                    className="w-full bg-indigo-500/5 border border-indigo-500/15 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  />
                  {thresholdType === "percent" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {thresholdType === "absolute"
                    ? "Игроки с меньшим числом игр не попадут в рейтинг"
                    : "Например, 50% при 20 играх = минимум 10 игр для рейтинга"}
                </p>
              </div>
            )}
            {seasons.some((s) => s.isActive) && (
              <p className="text-sm text-amber-400 flex items-center gap-1">
                <AlertTriangle size={14} /> Текущий активный сезон будет автоматически завершён
              </p>
            )}
          </div>
        </Modal>
      )}

      {editingSeason && (
        <Modal
          title="Редактировать сезон"
          onClose={() => setEditingSeason(null)}
          footer={
            <>
              <button onClick={() => setEditingSeason(null)}
                disabled={savingEdit}
                className="px-4 py-2 btn-ghost cursor-pointer text-sm disabled:opacity-50">
                Отмена
              </button>
              <button onClick={handleSaveEditSeason}
                disabled={savingEdit || !editSeasonName.trim() || !isThresholdValid(editThresholdType, editThresholdValue)}
                className="flex items-center gap-2 px-4 py-2 btn-gradient cursor-pointer disabled:bg-slate-800/30 disabled:text-slate-500 text-white rounded-lg text-sm">
                {savingEdit && <Loader size={14} className="animate-spin" />}
                {savingEdit ? "Сохранение..." : "Сохранить"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Название <span className="text-red-400">*</span>
              </label>
              <input type="text" value={editSeasonName}
                onChange={(e) => setEditSeasonName(e.target.value)}
                className="w-full bg-indigo-500/5 border border-indigo-500/15 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                autoFocus />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editTrackFirstKill"
                checked={editTrackFirstKill}
                onChange={(e) => setEditTrackFirstKill(e.target.checked)}
                className="rounded border-indigo-500/15 text-emerald-600 focus:ring-indigo-500/50"
              />
              <label htmlFor="editTrackFirstKill" className="text-sm text-slate-200">
                Отслеживать первоубиенного (ПУ)
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Порог рейтинга</label>
              <select
                value={editThresholdType}
                onChange={(e) => {
                  setEditThresholdType(e.target.value);
                  if (e.target.value === "none") setEditThresholdValue("");
                  else if (!editThresholdValue) setEditThresholdValue("1");
                }}
                className="w-full bg-indigo-500/5 border border-indigo-500/15 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
              >
                <option value="none">Без порога</option>
                <option value="absolute">Минимум игр</option>
                <option value="percent">Процент от игр сезона</option>
              </select>
            </div>
            {editThresholdType !== "none" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {editThresholdType === "absolute" ? "Минимальное количество игр" : "Процент от общего числа игр"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={editThresholdValue}
                    onChange={(e) => setEditThresholdValue(e.target.value)}
                    min={1}
                    max={editThresholdType === "percent" ? 100 : undefined}
                    placeholder={editThresholdType === "absolute" ? "5" : "50"}
                    className="w-full bg-indigo-500/5 border border-indigo-500/15 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  />
                  {editThresholdType === "percent" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {editThresholdType === "absolute"
                    ? "Игроки с меньшим числом игр не попадут в рейтинг"
                    : "Например, 50% при 20 играх = минимум 10 игр для рейтинга"}
                </p>
              </div>
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
                disabled={resetting}
                className="px-4 py-2 btn-ghost cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed">Отмена</button>
              <button onClick={handleReset}
                disabled={resetWord !== "УДАЛИТЬ" || resetting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-800/30 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm">
                {resetting && <Loader size={14} className="animate-spin" />}
                {resetting ? "Сброс..." : "Сбросить"}
              </button>
            </>
          }>
          <div className="space-y-3">
            <p className="text-slate-300">
              Все сезоны, игроки и игры будут удалены. Будет создан новый пустой «Сезон 1».
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Введите <span className="font-mono font-bold text-red-400">УДАЛИТЬ</span> для подтверждения
              </label>
              <input type="text" value={resetWord}
                onChange={(e) => setResetWord(e.target.value)}
                className="w-full bg-indigo-500/5 border border-red-500/30 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                placeholder="УДАЛИТЬ" autoFocus />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
