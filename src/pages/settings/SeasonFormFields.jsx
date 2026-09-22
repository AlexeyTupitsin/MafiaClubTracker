import { withThresholdType, withTrackFirstKill } from "./seasonFormLogic";

export const seasonInputClass = "w-full bg-indigo-500/5 border border-indigo-500/15 text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none";
const checkboxClass = "rounded border-indigo-500/15 text-emerald-600 focus:ring-indigo-500/50";

/**
 * Общие поля окон «Новый сезон» и «Редактировать сезон»: название, флаги, порог.
 * children — дополнительные поля между названием и флагами (дата начала у нового сезона).
 */
export function SeasonFormFields({ form, onChange, idPrefix, namePlaceholder, children }) {
  const set = (patch) => onChange({ ...form, ...patch });
  const { thresholdType } = form;

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Название <span className="text-red-400">*</span>
        </label>
        <input type="text" value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          className={seasonInputClass}
          placeholder={namePlaceholder} autoFocus />
      </div>
      {children}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`${idPrefix}TrackFirstKill`}
          checked={form.trackFirstKill}
          onChange={(e) => onChange(withTrackFirstKill(form, e.target.checked))}
          className={checkboxClass}
        />
        <label htmlFor={`${idPrefix}TrackFirstKill`} className="text-sm text-slate-200">
          Отслеживать первоубиенного (ПУ)
        </label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`${idPrefix}TrackBestMove`}
          checked={form.trackBestMove}
          disabled={!form.trackFirstKill}
          onChange={(e) => set({ trackBestMove: e.target.checked })}
          className={`${checkboxClass} disabled:opacity-40 disabled:cursor-not-allowed`}
        />
        <label htmlFor={`${idPrefix}TrackBestMove`} className={`text-sm ${form.trackFirstKill ? "text-slate-200" : "text-slate-500"}`}>
          Отслеживать лучший ход
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Порог рейтинга</label>
        <select
          value={thresholdType}
          onChange={(e) => onChange(withThresholdType(form, e.target.value))}
          className={seasonInputClass}
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
              value={form.thresholdValue}
              onChange={(e) => set({ thresholdValue: e.target.value })}
              min={1}
              max={thresholdType === "percent" ? 100 : undefined}
              placeholder={thresholdType === "absolute" ? "5" : "50"}
              className={seasonInputClass}
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
    </>
  );
}
