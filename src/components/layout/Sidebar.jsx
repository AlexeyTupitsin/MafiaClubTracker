import { useState } from "react";
import { ChevronDown, LogIn, LogOut, Menu, X, LayoutDashboard, Sword, Award, Trophy, Users, Settings } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Modal } from "../ui";
import { LoginForm } from "../auth/LoginForm";

const NAV_SECTIONS = [
  {
    items: [
      { id: "dashboard", label: "Дашборд", icon: LayoutDashboard },
    ],
  },
  {
    title: "Клуб",
    items: [
      { id: "rating", label: "Рейтинг", icon: Trophy },
      { id: "players", label: "Игроки", icon: Users },
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

export function Sidebar({ currentPage, navigate, seasons, currentSeasonId, setCurrentSeasonId }) {
  const { user, isAdmin, signOut } = useAuth();
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
        className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
          isActive
            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm shadow-indigo-500/5"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
        }`}
        role="tab"
        aria-selected={isActive}
      >
        <Icon size={18} className={isActive ? "text-indigo-400" : ""} />
        {item.label}
      </button>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-[220px] bg-[#0a0908]/95 backdrop-blur-xl border-r border-indigo-500/10 z-40">
        {/* Logo */}
        <div className="p-5 pb-3">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="IronMaf" className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-black/40" />
            <div>
              <h1 className="text-base font-bold text-indigo-50">IronMaf</h1>
              <p className="text-[11px] text-slate-500">Спортивная мафия</p>
            </div>
          </div>
        </div>

        {/* Navigation with sections */}
        <nav className="flex-1 px-3 overflow-y-auto" role="tablist" aria-label="Навигация">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className={sIdx > 0 ? "mt-5" : "mt-1"}>
              {section.title && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase text-slate-500/70">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(renderNavButton)}
              </div>
            </div>
          ))}

          {/* Settings — separate, admin only */}
          {isAdmin && (
            <div className="mt-5">
              <div className="space-y-0.5">
                {renderNavButton({ id: "settings", label: "Настройки", icon: Settings })}
              </div>
            </div>
          )}
        </nav>

        {/* Season selector + Auth */}
        <div className="p-3 space-y-2 border-t border-indigo-500/10">
          <div className="relative">
            <select
              value={currentSeasonId || ""}
              onChange={(e) => setCurrentSeasonId(e.target.value)}
              className="appearance-none w-full bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-3 py-2 pr-8 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer hover:border-indigo-500/30 transition-colors"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.isActive ? " (активен)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          {isAdmin ? (
            <button
              onClick={signOut}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              aria-label="Выйти"
            >
              <LogOut size={16} />
              Выйти
            </button>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 rounded-xl transition-colors cursor-pointer"
              aria-label="Войти"
            >
              <LogIn size={16} />
              Войти
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-[#0a0908]/90 backdrop-blur-xl border-b border-indigo-500/10 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="IronMaf" className="w-8 h-8 rounded-lg object-cover shadow-md shadow-black/40" />
            <span className="text-base font-bold text-indigo-50">IronMaf</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={currentSeasonId || ""}
                onChange={(e) => setCurrentSeasonId(e.target.value)}
                className="appearance-none bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-2.5 py-1.5 pr-7 text-xs text-slate-200 outline-none cursor-pointer"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-35 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-[52px] left-0 right-0 z-40 bg-[#0a0908]/98 backdrop-blur-xl border-b border-indigo-500/10 shadow-xl">
          <nav className="px-3 py-3 space-y-0.5">
            {NAV_SECTIONS.map((section, sIdx) => (
              <div key={sIdx} className={sIdx > 0 ? "mt-3" : ""}>
                {section.title && (
                  <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest uppercase text-slate-500/70">
                    {section.title}
                  </p>
                )}
                {section.items.map(renderNavButton)}
              </div>
            ))}
            {isAdmin && (
              <div className="mt-3">
                {renderNavButton({ id: "settings", label: "Настройки", icon: Settings })}
              </div>
            )}
          </nav>
          <div className="px-3 pb-3 border-t border-indigo-500/10 pt-3">
            {isAdmin ? (
              <button
                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                Выйти
              </button>
            ) : (
              <button
                onClick={() => { setShowLogin(true); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 rounded-xl transition-colors cursor-pointer"
              >
                <LogIn size={16} />
                Войти
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0908]/90 backdrop-blur-xl border-t border-indigo-500/10 z-40 pb-[env(safe-area-inset-bottom)]" role="tablist" aria-label="Навигация">
        <div className="flex justify-around">
          {MOBILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = getIsActive(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => handleNavigate(tab.id)}
                className={`flex flex-col items-center gap-1 px-2 py-2.5 flex-1 text-[10px] font-medium transition-colors cursor-pointer ${
                  isActive ? "text-indigo-400" : "text-slate-600"
                }`}
                role="tab"
                aria-selected={isActive}
              >
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Login Modal */}
      {showLogin && (
        <Modal title="Вход для ведущего" onClose={() => setShowLogin(false)}>
          <LoginForm onClose={() => setShowLogin(false)} />
        </Modal>
      )}
    </>
  );
}
