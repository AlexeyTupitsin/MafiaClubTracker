import { useState } from "react";
import { ChevronDown, LogIn, LogOut, MoreHorizontal, X, LayoutDashboard, Sword, Award, Trophy, Users, Settings, BarChart3 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { CLUB_NAME } from "../../lib/clubConfig";
import { Modal } from "../ui";
import { LoginForm } from "../auth/LoginForm";

const NAV_SECTIONS = [
  {
    items: [
      { id: "dashboard", label: "Обзор", icon: LayoutDashboard },
    ],
  },
  {
    title: "Клуб",
    items: [
      { id: "rating", label: "Рейтинг", icon: Trophy },
      { id: "players", label: "Игроки", icon: Users },
      { id: "stats", label: "Статистика", icon: BarChart3 },
    ],
  },
  {
    title: "Игры",
    items: [
      { id: "tournaments", label: "Турниры", icon: Award },
      { id: "games", label: "Игры", icon: Sword },
    ],
  },
];

const MOBILE_TABS = [
  { id: "dashboard", label: "Обзор", icon: LayoutDashboard },
  { id: "rating", label: "Рейтинг", icon: Trophy },
  { id: "players", label: "Игроки", icon: Users },
  { id: "tournaments", label: "Турниры", icon: Award },
  { id: "games", label: "Игры", icon: Sword },
];

function SeasonSelect({ seasons, currentSeasonId, setCurrentSeasonId, compact = false }) {
  return (
    <div className="relative">
      <select
        value={currentSeasonId || ""}
        onChange={(e) => setCurrentSeasonId(e.target.value)}
        aria-label="Сезон"
        className={`appearance-none w-full bg-elev-2 border border-line-strong text-stone-200 outline-none cursor-pointer hover:border-stone-600 focus:ring-2 focus:ring-accent-400/40 transition-colors ${
          compact ? "rounded-lg h-9 pl-3 pr-8 text-base max-w-[160px]" : "rounded-[10px] h-10 pl-3 pr-8 text-sm"
        }`}
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}{!compact && s.isActive ? " · активен" : ""}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
    </div>
  );
}

export function Sidebar({ currentPage, navigate, seasons, currentSeasonId, setCurrentSeasonId }) {
  const { isAdmin, signOut } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getIsActive = (tabId) =>
    currentPage === tabId ||
    (tabId === "games" && ["gameDetail", "gameForm"].includes(currentPage)) ||
    (tabId === "players" && ["playerProfile", "compare"].includes(currentPage)) ||
    (tabId === "tournaments" && ["tournamentDetail", "tournamentForm"].includes(currentPage));

  const handleNavigate = (tabId) => {
    navigate(tabId);
    setMobileMenuOpen(false);
  };

  const renderNavButton = (item) => {
    const Icon = item.icon;
    const isActive = getIsActive(item.id);
    return (
      <button
        key={item.id}
        onClick={() => handleNavigate(item.id)}
        aria-current={isActive ? "page" : undefined}
        className={`relative flex items-center gap-3 w-full h-10 px-3 rounded-[10px] text-sm font-medium cursor-pointer ${
          isActive
            ? "bg-elev-2 text-stone-50"
            : "text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]"
        }`}
      >
        {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent-400" aria-hidden="true" />}
        <Icon size={18} className={isActive ? "text-accent-400" : ""} aria-hidden="true" />
        {item.label}
      </button>
    );
  };

  const authButton = (onAfter) => isAdmin ? (
    <button
      onClick={() => { signOut(); onAfter?.(); }}
      className="flex items-center gap-2.5 w-full h-10 px-3 text-sm text-stone-400 hover:text-stone-100 hover:bg-white/[0.04] rounded-[10px] cursor-pointer"
    >
      <LogOut size={16} aria-hidden="true" />
      Выйти
    </button>
  ) : (
    <button
      onClick={() => { setShowLogin(true); onAfter?.(); }}
      className="flex items-center gap-2.5 w-full h-10 px-3 text-sm text-stone-300 hover:text-stone-50 hover:bg-white/[0.04] rounded-[10px] cursor-pointer"
    >
      <LogIn size={16} aria-hidden="true" />
      Вход для ведущего
    </button>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-[220px] bg-surface border-r border-line z-40">
        <button
          onClick={() => handleNavigate("dashboard")}
          className="flex items-center gap-3 px-5 pt-6 pb-5 text-left cursor-pointer"
          aria-label={`${CLUB_NAME} — на главную`}
        >
          <img src="/logo.jpg" alt="" className="w-10 h-10 rounded-xl object-cover ring-1 ring-line-strong" />
          <span>
            <span className="block font-display text-[15px] font-bold leading-tight text-stone-50">{CLUB_NAME}</span>
            <span className="block text-xs text-stone-500 mt-0.5">Спортивная мафия</span>
          </span>
        </button>

        <nav className="flex-1 px-3 overflow-y-auto" aria-label="Разделы">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className={sIdx > 0 ? "mt-6" : ""}>
              {section.title && (
                <p className="px-3 mb-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-stone-500">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(renderNavButton)}
              </div>
            </div>
          ))}

          {isAdmin && (
            <div className="mt-6 pt-4 border-t border-line">
              {renderNavButton({ id: "settings", label: "Настройки", icon: Settings })}
            </div>
          )}
        </nav>

        <div className="p-3 space-y-1 border-t border-line">
          <p className="px-1 pb-1 text-[11px] font-semibold tracking-[0.12em] uppercase text-stone-500">Сезон</p>
          <SeasonSelect seasons={seasons} currentSeasonId={currentSeasonId} setCurrentSeasonId={setCurrentSeasonId} />
          <div className="pt-1">{authButton()}</div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-b border-line z-40">
        <div className="flex items-center justify-between gap-2 pl-4 pr-1.5 h-14">
          <button onClick={() => handleNavigate("dashboard")} className="flex items-center gap-2.5 min-w-0 cursor-pointer" aria-label={`${CLUB_NAME} — на главную`}>
            <img src="/logo.jpg" alt="" className="w-8 h-8 rounded-lg object-cover ring-1 ring-line-strong" />
            <span className="font-display text-sm font-bold text-stone-50 truncate">{CLUB_NAME}</span>
          </button>
          <div className="flex items-center gap-0.5">
            <SeasonSelect compact seasons={seasons} currentSeasonId={currentSeasonId} setCurrentSeasonId={setCurrentSeasonId} />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-11 h-11 flex items-center justify-center text-stone-400 hover:text-stone-100 rounded-lg cursor-pointer"
              aria-label={mobileMenuOpen ? "Закрыть меню" : "Ещё"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={22} /> : <MoreHorizontal size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile «Ещё»: только то, чего нет в нижних вкладках */}
      {mobileMenuOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-surface-raised border-b border-line-strong shadow-2xl shadow-black/60 animate-slide-up">
            <div className="p-3 space-y-0.5">
              {renderNavButton({ id: "stats", label: "Статистика клуба", icon: BarChart3 })}
              {isAdmin && renderNavButton({ id: "settings", label: "Настройки", icon: Settings })}
              {authButton(() => setMobileMenuOpen(false))}
            </div>
          </div>
        </>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-xl border-t border-line z-40 pb-[env(safe-area-inset-bottom)]" aria-label="Разделы">
        <div className="flex">
          {MOBILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = getIsActive(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => handleNavigate(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 flex-1 h-16 text-[11px] font-medium cursor-pointer ${
                  isActive ? "text-stone-50" : "text-stone-400"
                }`}
              >
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-accent-400" aria-hidden="true" />}
                <Icon size={21} className={isActive ? "text-accent-400" : ""} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {showLogin && (
        <Modal title="Вход для ведущего" onClose={() => setShowLogin(false)}>
          <LoginForm onClose={() => setShowLogin(false)} />
        </Modal>
      )}
    </>
  );
}
