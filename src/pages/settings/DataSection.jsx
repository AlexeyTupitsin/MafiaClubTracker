import { useState } from "react";
import { Check, Copy, Download, RefreshCw, Upload, X } from "lucide-react";
import { Button, ConfirmDialog, FormStatus } from "../../components/ui";
import { exportAllData, importData, recalcElo } from "../../lib/queries";
import { validateImportData, formatImportErrors } from "../../lib/importValidation";
import { localIsoDate } from "../../lib/utils";

function downloadJson(text, name = "mafia-club-export") {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}-${localIsoDate()}.json`;
  a.click();
  // Сразу после click() некоторые браузеры ещё не начали скачивание
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Строка раздела: что делает действие, кнопка, и результат именно этого действия под ним
function ActionRow({ title, description, action, status }) {
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-stone-100">{title}</p>
          <p className="text-[13px] text-stone-500 mt-0.5 max-w-prose">{description}</p>
        </div>
        <div className="shrink-0 [&>*]:w-full sm:[&>*]:w-auto">{action}</div>
      </div>
      {status && <FormStatus tone={status.tone} className="mt-2">{status.text}</FormStatus>}
    </li>
  );
}

// Данные: резервная копия, загрузка из файла, пересчёт ELO.
// Результат и ошибка каждого действия показываются в его строке.
export function DataSection({ showToast, refreshData, refreshAllGames, refreshPlayers }) {
  const [exportText, setExportText] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [busy, setBusy] = useState(null); // "export" | "elo"
  const [status, setStatus] = useState({}); // { export|import|elo: { tone, text } }

  const report = (key, tone, text) => setStatus((s) => ({ ...s, [key]: text ? { tone, text } : null }));

  const handleRecalcElo = async () => {
    setBusy("elo");
    report("elo");
    try {
      const { gamesProcessed, rowsUpdated, playersUpdated } = await recalcElo();
      await Promise.all([refreshAllGames(), refreshPlayers()]);
      const updated = rowsUpdated + playersUpdated;
      showToast(updated > 0
        ? `ELO пересчитан: игр ${gamesProcessed}, обновлено записей ${updated}`
        : `ELO актуален — игр проверено: ${gamesProcessed}`);
    } catch (err) {
      report("elo", "error", `Не удалось пересчитать ELO: ${err.message || "неизвестная ошибка"}. Попробуйте ещё раз.`);
    } finally {
      setBusy(null);
    }
  };

  const handleExport = async () => {
    setBusy("export");
    report("export");
    try {
      const text = JSON.stringify(await exportAllData(), null, 2);
      downloadJson(text);
      setExportText(text);
    } catch (err) {
      report("export", "error", `Не удалось собрать копию: ${err.message || "неизвестная ошибка"}`);
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      report("export", "warning", "Не удалось скопировать — выделите текст в поле вручную");
    });
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    report("import");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const errors = validateImportData(data);
        if (errors.length === 0) setPendingImport(data);
        else report("import", "error", `Файл «${file.name}» не прошёл проверку: ${formatImportErrors(errors)}`);
      } catch {
        report("import", "error", `Файл «${file.name}» не читается как JSON — нужен файл резервной копии отсюда же`);
      }
    };
    reader.readAsText(file);
  };

  // Окно подтверждения остаётся открытым (со спиннером), пока идёт импорт
  const handleImportConfirm = async () => {
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
        report("import", "warning", `Данные загружены, но ELO не пересчитан: ${eloError.message}. Нажмите «Пересчитать».`);
      } else {
        showToast("Данные загружены");
      }
    } catch (err) {
      console.error("Import error:", err);
      setPendingImport(null);
      report("import", "error", `Загрузка не удалась: ${err.message || "неизвестная ошибка"}`);
    }
  };

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="data-title">
      <h3 id="data-title" className="text-lg font-semibold">Данные</h3>
      <p className="text-[13px] text-stone-500 mt-0.5 mb-5">Всё, что хранится в базе клуба: сезоны, игроки, игры и турниры</p>

      <ul className="divide-y divide-line">
        <ActionRow
          title="Резервная копия"
          description="Скачивает все данные одним файлом JSON. Сделайте копию перед большими правками."
          status={status.export}
          action={
            <Button variant="secondary" icon={Download} loading={busy === "export"} onClick={handleExport}>
              Скачать копию
            </Button>
          }
        />
        <ActionRow
          title="Загрузить из копии"
          description="Заменяет все текущие данные содержимым файла. Перед загрузкой текущие данные скачаются отдельной копией."
          status={status.import}
          action={
            <label className="btn-secondary btn-md cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent-400">
              <Upload size={16} aria-hidden="true" /> Выбрать файл
              <input type="file" accept=".json,application/json" onChange={handleImportFile} className="sr-only" />
            </label>
          }
        />
        <ActionRow
          title="Пересчитать ELO"
          description="ELO обновляется сам после каждой игры. Пересчёт нужен после загрузки из копии или если рейтинг выглядит неверно."
          status={status.elo}
          action={
            <Button variant="secondary" icon={RefreshCw} loading={busy === "elo"} onClick={handleRecalcElo}>
              Пересчитать
            </Button>
          }
        />
      </ul>

      {exportText && (
        <div className="mt-5 rounded-xl border border-line bg-elev-2/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-[13px] text-stone-400">
              Файл скачан. Если браузер его не сохранил — скопируйте текст.
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={handleCopy}>
                {copied ? "Скопировано" : "Копировать"}
              </Button>
              <Button variant="ghost" size="sm" icon={X} aria-label="Скрыть текст копии" onClick={() => setExportText(null)} />
            </div>
          </div>
          <textarea
            readOnly
            value={exportText}
            rows={6}
            aria-label="Текст резервной копии"
            className="input !text-xs font-mono text-stone-300"
            onClick={(e) => e.target.select()}
          />
        </div>
      )}

      {pendingImport && (
        <ConfirmDialog
          title="Заменить все данные?"
          message={`В файле: ${pendingImport.seasons.length} сезонов, ${pendingImport.players.length} игроков, ${Object.values(pendingImport.games).flat().length} игр. Всё, что сейчас в базе, будет заменено. Текущие данные сначала скачаются копией.`}
          onConfirm={handleImportConfirm}
          onCancel={() => setPendingImport(null)}
          confirmText="Заменить данные"
          danger
        />
      )}
    </section>
  );
}
