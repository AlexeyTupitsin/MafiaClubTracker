// Форма сезона (создание и редактирование) — чистая логика, покрыта тестами.

export const NEW_SEASON_FORM = {
  name: "",
  trackFirstKill: true,
  trackBestMove: false,
  thresholdType: "none",
  thresholdValue: "",
};

export function seasonToForm(season) {
  const thresholdType = season.ratingThresholdType || "none";
  return {
    name: season.name,
    trackFirstKill: season.trackFirstKill ?? false,
    trackBestMove: season.trackBestMove ?? false,
    thresholdType,
    thresholdValue: thresholdType !== "none" ? String(season.ratingThresholdValue || "") : "",
  };
}

// Порог: целое ≥ 1, для процента — не больше 100
export function isThresholdValid(type, value) {
  if (type === "none") return true;
  const num = parseInt(value, 10);
  if (Number.isNaN(num) || num < 1) return false;
  return !(type === "percent" && num > 100);
}

export function thresholdForSave(type, value) {
  return type === "none" ? 0 : (parseInt(value, 10) || 0);
}

// Смена типа порога: «без порога» очищает значение, иначе подставляет 1, если пусто
export function withThresholdType(form, thresholdType) {
  let { thresholdValue } = form;
  if (thresholdType === "none") thresholdValue = "";
  else if (!thresholdValue) thresholdValue = "1";
  return { ...form, thresholdType, thresholdValue };
}

// Лучший ход без первоубиенного не отслеживается
export function withTrackFirstKill(form, trackFirstKill) {
  return { ...form, trackFirstKill, trackBestMove: trackFirstKill && form.trackBestMove };
}
