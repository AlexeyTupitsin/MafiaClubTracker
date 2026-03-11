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
} from "lucide-react";
import { Modal, ConfirmDialog, Badge } from "../components/ui";
import { generateId, getTeam, formatDate } from "../lib/utils";
import { safeGet, safeSet, safeDelete } from "../lib/storage";

export function SettingsPage({
  seasons, setSeasons, saveSeasons,
  games, setGames,
  players, setPlayers, savePlayers,
  currentSeasonId, setCurrentSeasonId,
  showToast, reloadData,
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

  // --- Season handlers ---
  const handleCreateSeason = async () => {
    const trimmed = seasonName.trim();
    if (!trimmed) { setError("Введите название сезона"); return; }

    const updated = seasons.map((s) =>
      s.isActive ? { ...s, isActive: false, endDate: new Date().toISOString().split("T")[0] } : s
    );
    const newSeason = {
      id: generateId(), name: trimmed, startDate: seasonStart,
      endDate: null, isActive: true,
    };
    const newSeasons = [...updated, newSeason];
    setSeasons(newSeasons);
    await saveSeasons(newSeasons);
    setCurrentSeasonId(newSeason.id);
    setGames([]);
    setShowNewSeason(false);
    setSeasonName("");
    setError("");
    showToast("Сезон создан");
  };

  const handleEndSeason = async (season) => {
    const updated = seasons.map((s) =>
      s.id === season.id ? { ...s, isActive: false, endDate: new Date().toISOString().split("T")[0] } : s
    );
    setSeasons(updated);
    await saveSeasons(updated);
    setConfirmEnd(null);
    showToast("Сезон завершён");
  };

  const handleDeleteSeason = async (season) => {
    const seasonGames = season.id === currentSeasonId
      ? games : await safeGet(`games:${season.id}`, []);
    if (seasonGames.length > 0) {
      setError("Нельзя удалить сезон с играми");
      setConfirmDelete(null);
      return;
    }
    const updated = seasons.filter((s) => s.id !== season.id);
    setSeasons(updated);
    await saveSeasons(updated);
    if (currentSeasonId === season.id) {
      const fallback = updated.find((s) => s.isActive) || updated[updated.length - 1];
      if (fallback) setCurrentSeasonId(fallback.id);
    }
    try { await safeDelete(`games:${season.id}`); } catch {}
    setConfirmDelete(null);
    setError("");
    showToast("Сезон удалён");
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

    const demoPlayers = demoNicknames
      .filter((d) => !players.some((p) => p.nickname.toLowerCase() === d.nickname.toLowerCase()))
      .map((d) => ({
        id: generateId(), nickname: d.nickname, realName: d.realName,
        createdAt: new Date().toISOString(), isActive: true,
      }));

    const allPlayers = [...players, ...demoPlayers];
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
    const demoGames = [];
    const numGames = Math.min(10, Math.floor(activePlayers.length / 10) * 5);

    for (let i = 0; i < numGames; i++) {
      const shuffledPlayers = [...activePlayers].sort(() => Math.random() - 0.5).slice(0, 10);
      const shuffledRoles = [...roleSet].sort(() => Math.random() - 0.5);
      const winner = Math.random() > 0.45 ? "red" : "black";

      const gamePlayers = shuffledPlayers.map((player, idx) => {
        const role = shuffledRoles[idx];
        const team = getTeam(role);
        const result = team === winner ? "win" : "lose";
        const baseScore = result === "win" ? 1 : 0;
        const bonusScore = Math.random() > 0.7
          ? parseFloat((Math.random() * 1 - 0.5).toFixed(1)) : 0;
        return {
          playerId: player.id, seat: idx + 1, role, result, baseScore, bonusScore,
          bonusComment: bonusScore > 0 ? "Лучший ход" : bonusScore < 0 ? "Фол" : null,
          totalScore: baseScore + bonusScore,
        };
      });

      demoGames.push({
        id: generateId(), seasonId: currentSeasonId,
        gameNumber: maxGameNum + i + 1,
        date: new Date(Date.now() - (numGames - 1 - i) * 86400000).toISOString(),
        winner, players: gamePlayers, notes: null,
        createdAt: new Date().toISOString(),
      });
    }

    setPlayers(allPlayers);
    await savePlayers(allPlayers);
    const allGames = [...games, ...demoGames];
    setGames(allGames);
    await safeSet(`games:${currentSeasonId}`, allGames);
    setConfirmDemo(false);
    setError("");
    showToast(`Создано ${demoPlayers.length} игроков и ${numGames} игр`);
  };

  // --- Export ---
  const [exportData, setExportData] = useState(null);

  const handleExport = async () => {
    const allGames = {};
    for (const s of seasons) {
      if (s.id === currentSeasonId) {
        allGames[s.id] = games;
      } else {
        allGames[s.id] = await safeGet(`games:${s.id}`, []);
      }
    }
    const data = {
      exportDate: new Date().toISOString(),
      version: 1,
      seasons,
      players,
      games: allGames,
    };
    setExportData(JSON.stringify(data, null, 2));
  };

  const handleCopyExport = () => {
    if (!exportData) return;
    navigator.clipboard.writeText(exportData).then(() => {
      showToast("Скопировано в буфер обмена");
    }).catch(() => {
      showToast("Не удалось скопировать — выделите текст вручную");
    });
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
    const data = confirmImport;
    await safeSet("seasons", data.seasons);
    await safeSet("players", data.players);
    for (const [seasonId, seasonGames] of Object.entries(data.games)) {
      await safeSet(`games:${seasonId}`, seasonGames);
    }
    await reloadData();
    setConfirmImport(null);
    showToast("Данные импортированы");
  };

  // --- Reset ---
  const handleReset = async () => {
    for (const s of seasons) {
      try { await safeDelete(`games:${s.id}`); } catch {}
    }
    try { await safeDelete("seasons"); } catch {}
    try { await safeDelete("players"); } catch {}

    const firstSeason = {
      id: generateId(), name: "Сезон 1",
      startDate: new Date().toISOString().split("T")[0],
      endDate: null, isActive: true,
    };
    await safeSet("seasons", [firstSeason]);
    setSeasons([firstSeason]);
    setPlayers([]);
    await safeSet("players", []);
    setCurrentSeasonId(firstSeason.id);
    setGames([]);
    setConfirmReset(false);
    setResetWord("");
    showToast("Все данные сброшены");
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
                  <div className="font-medium truncate">{season.name}</div>
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
              <span className="text-sm text-gray-500">Скопируйте данные и сохраните в .json файл:</span>
              <div className="flex gap-2">
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
