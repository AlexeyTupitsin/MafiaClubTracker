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
      <nav className="bg-white border-b hidden sm:block">
        <div className="max-w-4xl mx-auto px-4 flex overflow-x-auto">
          {TABS.filter((tab) => tab.id !== "settings" || isAdmin).map((tab) => {
            const Icon = tab.icon;
            const isActive = getIsActive(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg sm:hidden z-30">
        <div className="flex justify-around">
          {TABS.filter((tab) => tab.id !== "settings" || isAdmin).map((tab) => {
            const Icon = tab.icon;
            const isActive = getIsActive(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 flex-1 text-xs font-medium transition-colors ${
                  isActive ? "text-indigo-600" : "text-gray-400"
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
