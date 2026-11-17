import { UserCheck, UserRound } from "lucide-react";
import { BackButton, PlayerAvatar, Select } from "../../components/ui";
import { useMe } from "../../hooks/useMe";

// «Это я»: отметка хранится в этом браузере — подсветка в рейтинге и играх
function MeToggle({ playerId }) {
  const [meId, setMe] = useMe();
  const isMe = meId === playerId;
  return (
    <button
      type="button"
      onClick={() => setMe(isMe ? null : playerId)}
      aria-pressed={isMe}
      title={isMe ? "Снять отметку" : "Ваши строки будут подсвечены в рейтинге и списке игр (только на этом устройстве)"}
      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
        isMe
          ? "border-accent-400/50 bg-accent-400/10 text-accent-200 hover:bg-accent-400/15"
          : "border-line-strong text-stone-400 hover:text-stone-100 hover:bg-elev-2"
      }`}
    >
      {isMe ? <UserCheck size={15} aria-hidden="true" /> : <UserRound size={15} aria-hidden="true" />}
      {isMe ? "Это вы" : "Это я"}
    </button>
  );
}

// Шапка профиля: назад, аватар, ник и подзаголовок
export function ProfileHeader({ player, subtitle, onBack }) {
  return (
    <header className="flex items-start gap-3">
      <BackButton onClick={onBack} />
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 min-w-0 flex-1">
        <span className="rounded-full ring-1 ring-line-strong ring-offset-4 ring-offset-surface w-fit">
          <PlayerAvatar player={player} size="lg" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{player.isActive === false ? "Не в составе" : "Игрок клуба"}</p>
          <h2 className="page-title mt-1.5 break-words">{player.nickname}</h2>
          {subtitle && <p className="text-sm text-stone-400 mt-2">{subtitle}</p>}
        </div>
        <div className="sm:self-start">
          <MeToggle playerId={player.id} />
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
