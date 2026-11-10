import { BackButton, PlayerAvatar, Select } from "../../components/ui";

// Шапка профиля: назад, аватар, ник и подзаголовок
export function ProfileHeader({ player, subtitle, onBack }) {
  return (
    <header className="flex items-start gap-3">
      <BackButton onClick={onBack} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 min-w-0">
        <span className="rounded-full ring-1 ring-line-strong ring-offset-4 ring-offset-surface w-fit">
          <PlayerAvatar player={player} size="lg" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">{player.isActive === false ? "Не в составе" : "Игрок клуба"}</p>
          <h2 className="page-title mt-1.5 break-words">{player.nickname}</h2>
          {subtitle && <p className="text-sm text-stone-400 mt-2">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

// Период статистики: все сезоны или один
export function PeriodSelect({ value, onChange, seasons }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Период статистики" wrapperClassName="w-full sm:w-fit" className="sm:!w-auto sm:min-w-[9rem]">
        <option value="all">Все сезоны</option>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </Select>
    </div>
  );
}
