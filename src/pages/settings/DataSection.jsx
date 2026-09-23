import { useState } from "react";
import { CheckCircle, Download, Loader, RefreshCw, Upload, X } from "lucide-react";
import { ConfirmDialog } from "../../components/ui";
import { exportAllData, importData, recalcElo } from "../../lib/queries";
import { validateImportData, formatImportErrors } from "../../lib/importValidation";

const actionButton = "flex items-center gap-2 bg-slate-800/30 hover:bg-indigo-500/5 text-slate-300 px-4 py-2 rounded-lg text-sm";
const linkButton = "flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium";

function downloadJson(text, name = "mafia-club-export") {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  // Сразу после click() некоторые браузеры ещё не начали скачивание
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Данные: экспорт, импорт, пересчёт ELO.
// onError — текст для общей плашки ошибки страницы («» — скрыть).
export function DataSection({ showToast, onError, refreshData, refreshGames, refreshAllGames, refreshPlayers }) {
  const [exportText, setExportText] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  const fail = (title, err) => {
    onError(err.message || title);
    showToast(`${title}: ${err.message || "неизвестная ошибка"}`, "error");
  };

  const handleRecalcElo = async () => {
    setRecalculating(true);
    onError("");
    try {
      const { gamesProcessed } = await recalcElo();
      await refreshGames();
      await refreshAllGames();
      await refreshPlayers();
      showToast(`ELO пересчитан, игр обработано: ${gamesProcessed}`);
    } catch (err) {
      fail("Ошибка пересчёта ELO", err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      setExportText(JSON.stringify(data, null, 2));
    } catch (err) {
      fail("Ошибка экспорта", err);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText).then(() => {
      showToast("Скопировано в буфер обмена");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      showToast("Не удалось скопировать — выделите текст вручную", "warning");
    });
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let message;
      try {
        const data = JSON.parse(ev.target.result);
        const errors = validateImportData(data);
        if (errors.length === 0) {
          setPendingImport(data);
          return;
        }
        message = `Файл не прошёл проверку: ${formatImportErrors(errors)}`;
      } catch {
        message = "Ошибка чтения файла: некорректный JSON";
      }
      onError(message);
      showToast(message, "error");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Окно подтверждения остаётся открытым, пока идёт импорт
  const handleImportConfirm = async () => {
    onError("");
    try {
      // Импорт заменяет всё — сначала сохраняем текущие данные файлом.
      // Не удалось сохранить копию — не импортируем.
      let backup;
      try {
        backup = await exportAllData();
      } catch (err) {
        throw new Error(`не удалось сохранить резервную копию (${err.message}), импорт отменён`, { cause: err });
      }
      downloadJson(JSON.stringify(backup, null, 2), "mafia-club-backup-before-import");

      const { eloError } = await importData(pendingImport);
      setPendingImport(null);
      await refreshData();
      if (eloError) {
        const message = `Данные импортированы, но ELO не пересчитан: ${eloError.message}. Нажмите «Пересчитать ELO».`;
        onError(message);
        showToast(message, "warning");
      } else {
        showToast("Данные импортированы");
      }
    } catch (err) {
      console.error("Import error:", err);
      setPendingImport(null);
      fail("Ошибка импорта", err);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="text-lg font-semibold mb-3">Данные</h3>
      <div className="flex flex-wrap gap-3">
        <button onClick={handleExport} className={actionButton}>
          <Download size={16} /> Экспорт в JSON
        </button>
        <label className={`${actionButton} cursor-pointer`}>
          <Upload size={16} /> Импорт из JSON
          <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
        </label>
        <button onClick={handleRecalcElo} disabled={recalculating} className={`${actionButton} disabled:opacity-50`}>
          {recalculating ? <Loader size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Пересчитать ELO
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        ELO пересчитывается автоматически при добавлении и изменении игр.
        Кнопка нужна для первичного расчёта по уже внесённым играм.
      </p>

      {exportText && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-400">Скопируйте данные или скачайте файл:</span>
            <div className="flex gap-2">
              <button onClick={() => downloadJson(exportText)} className={linkButton}>
                <Download size={14} /> Скачать
              </button>
              <button onClick={handleCopy} className={linkButton}>
                <CheckCircle size={14} /> {copied ? "Скопировано ✓" : "Копировать"}
              </button>
              <button onClick={() => setExportText(null)} className="text-sm text-slate-500 hover:text-slate-300">
                <X size={14} />
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={exportText}
            rows={8}
            className="w-full border border-indigo-500/15 rounded-lg px-3 py-2 text-xs font-mono bg-indigo-500/5 text-slate-300 outline-none"
            onClick={(e) => e.target.select()}
          />
        </div>
      )}

      {pendingImport && (
        <ConfirmDialog title="Импортировать данные?"
          message={`Импорт перезапишет ВСЕ текущие данные. В файле: ${pendingImport.seasons.length} сезонов, ${pendingImport.players.length} игроков, ${Object.values(pendingImport.games).flat().length} игр. Перед импортом текущие данные скачаются файлом-копией. Продолжить?`}
          onConfirm={handleImportConfirm}
          onCancel={() => setPendingImport(null)} confirmText="Импортировать" danger />
      )}
    </div>
  );
}
