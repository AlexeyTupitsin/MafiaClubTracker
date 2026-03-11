import { ChevronDown } from "lucide-react";

export function Header({ seasons, currentSeasonId, setCurrentSeasonId }) {
  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          <span className="mr-1.5">🎭</span>Mafia Club
        </h1>
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
      </div>
    </header>
  );
}
