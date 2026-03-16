import { TABS } from "../../lib/constants";
import { useAuth } from "../../hooks/useAuth";

export function TabBar({ currentPage, navigate }) {
  const { isAdmin } = useAuth();
  const getIsActive = (tabId) =>
    currentPage === tabId ||
    (tabId === "games" && ["gameDetail", "gameForm"].includes(currentPage)) ||
    (tabId === "players" && ["playerProfile", "compare"].includes(currentPage)) ||
    (tabId === "tournaments" && ["tournamentDetail", "tournamentForm"].includes(currentPage));

  return (
    <>
      {/* Desktop Navigation Tabs */}
      <nav className="bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-zinc-800 hidden sm:block">
        <div className="max-w-6xl mx-auto px-4 flex overflow-x-auto">
          {TABS.filter((tab) => tab.id !== "settings" || isAdmin).map((tab) => {
            const Icon = tab.icon;
            const isActive = getIsActive(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-violet-500 text-violet-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-zinc-800 sm:hidden z-30">
        <div className="flex justify-around">
          {TABS.filter((tab) => tab.id !== "settings" || isAdmin).map((tab) => {
            const Icon = tab.icon;
            const isActive = getIsActive(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-3 flex-1 text-xs font-medium transition-colors ${
                  isActive ? "text-violet-400" : "text-zinc-600"
                }`}
              >
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
