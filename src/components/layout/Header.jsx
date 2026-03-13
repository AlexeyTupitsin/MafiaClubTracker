import { useState } from "react";
import { ChevronDown, LogIn, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Modal } from "../ui";
import { LoginForm } from "../auth/LoginForm";

export function Header({ seasons, currentSeasonId, setCurrentSeasonId }) {
  const { user, isAdmin, signOut } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <header className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-white text-xs font-bold">
              IM
            </div>
            <h1 className="text-xl font-bold text-gray-900">Iron Maf</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={currentSeasonId || ""}
                onChange={(e) => setCurrentSeasonId(e.target.value)}
                className="appearance-none bg-gray-50 border rounded-lg px-3 py-1.5 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.isActive ? " (активен)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {isAdmin ? (
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                title="Выйти"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
                title="Войти"
              >
                <LogIn size={16} />
                <span className="hidden sm:inline">Войти</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {showLogin && (
        <Modal title="Вход для ведущего" onClose={() => setShowLogin(false)}>
          <LoginForm onClose={() => setShowLogin(false)} />
        </Modal>
      )}
    </>
  );
}
