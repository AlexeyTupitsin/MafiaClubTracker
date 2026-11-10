import { ArrowLeft } from "lucide-react";

// Кнопка «назад» в шапке страницы: 44×44 под палец, стрелка выровнена по краю текста
export function BackButton({ onClick, label = "Назад", className = "" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`btn-ghost btn-icon -ml-2.5 text-stone-400 cursor-pointer ${className}`}
    >
      <ArrowLeft size={20} aria-hidden="true" />
    </button>
  );
}
