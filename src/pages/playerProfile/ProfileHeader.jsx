import { ArrowLeft } from "lucide-react";
import { PlayerAvatar } from "../../components/ui";

// Шапка профиля: назад, аватар, ник и подзаголовок
export function ProfileHeader({ player, subtitle, onBack }) {
  return (
    <div className="flex items-center gap-3">
      <button aria-label="Назад" onClick={onBack} className="p-1.5 hover:bg-indigo-500/5 rounded transition-colors">
        <ArrowLeft size={20} />
      </button>
      <PlayerAvatar player={player} size="lg" />
      <div>
        <h2 className="text-xl font-bold gradient-text">{player.nickname}</h2>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// Период статистики: все сезоны или один
export function PeriodSelect({ value, onChange, seasons }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg text-sm bg-indigo-500/5 border-indigo-500/15 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <option value="all">Все сезоны</option>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );
}
