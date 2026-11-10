import { Field, Input, Segmented, Switch } from "../../components/ui";
import { withThresholdType, withTrackFirstKill } from "./seasonFormLogic";

const THRESHOLD_OPTIONS = [
  { value: "none", label: "Без порога" },
  { value: "absolute", label: "Игр" },
  { value: "percent", label: "% от игр" },
];

/**
 * Общие поля окон «Новый сезон» и «Редактировать сезон»: название, что отмечать, порог.
 * children — поля между названием и флагами (дата начала у нового сезона).
 * errors — { name?, thresholdValue? } из validateSeasonForm, показываются под полями.
 */
export function SeasonFormFields({ form, onChange, errors = {}, namePlaceholder, children }) {
  const set = (patch) => onChange({ ...form, ...patch });
  const { thresholdType } = form;

  return (
    <div className="space-y-5">
      <Field label="Название" error={errors.name}>
        <Input type="text" value={form.name} maxLength={60}
          onChange={(e) => set({ name: e.target.value })}
          placeholder={namePlaceholder} autoFocus />
      </Field>

      {children}

      <fieldset>
        <legend className="field-label">Что отмечать в играх</legend>
        <div className="rounded-xl border border-line divide-y divide-line px-3">
          <div className="py-2.5">
            <Switch
              checked={form.trackFirstKill}
              onChange={(checked) => onChange(withTrackFirstKill(form, checked))}
              label="Первоубиенный (ПУ)"
              description="Кого убили первой ночью"
            />
          </div>
          <div className="py-2.5">
            <Switch
              checked={form.trackBestMove}
              disabled={!form.trackFirstKill}
              onChange={(checked) => set({ trackBestMove: checked })}
              label="Лучший ход"
              description={form.trackFirstKill ? "Три места, которые назвал ПУ" : "Нужен первоубиенный"}
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="field-label">Порог для рейтинга</legend>
        <Segmented
          label="Порог для рейтинга"
          value={thresholdType}
          onChange={(type) => onChange(withThresholdType(form, type))}
          options={THRESHOLD_OPTIONS}
        />
        {thresholdType !== "none" ? (
          <Field
            className="mt-3"
            label={thresholdType === "absolute" ? "Минимум игр" : "Минимум, % от игр сезона"}
            error={errors.thresholdValue}
            hint={thresholdType === "absolute"
              ? "Кто сыграл меньше, в рейтинг не попадёт"
              : "50% при 20 играх сезона — нужно сыграть 10"}
          >
            <div className="relative w-36">
              <Input
                type="text"
                inputMode="numeric"
                value={form.thresholdValue}
                onChange={(e) => set({ thresholdValue: e.target.value.replace(/\D/g, "") })}
                className={thresholdType === "percent" ? "pr-8" : ""}
              />
              {thresholdType === "percent" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm pointer-events-none">%</span>
              )}
            </div>
          </Field>
        ) : (
          <p className="field-hint">В рейтинге все, кто сыграл хотя бы одну игру</p>
        )}
      </fieldset>
    </div>
  );
}
