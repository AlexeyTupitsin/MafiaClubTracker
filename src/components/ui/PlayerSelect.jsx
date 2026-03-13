import { useState, useRef, useEffect, useMemo } from "react";
import { X, ChevronDown } from "lucide-react";

export function PlayerSelect({ value, onChange, players, disabledIds = [], placeholder = "Выберите игрока..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selectedPlayer = players.find((p) => p.id === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return players;
    const q = query.toLowerCase().trim();
    return players.filter((p) =>
      p.nickname.toLowerCase().includes(q) ||
      (p.realName && p.realName.toLowerCase().includes(q))
    );
  }, [players, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const item = listRef.current.children[highlightIndex];
      if (item) item.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex, isOpen]);

  const handleSelect = (playerId) => {
    onChange(playerId);
    setIsOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlightIndex]) {
          const p = filtered[highlightIndex];
          if (!disabledIds.includes(p.id)) handleSelect(p.id);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setQuery("");
        break;
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleContainerClick = () => {
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <div
        onClick={handleContainerClick}
        className={`flex items-center border rounded-lg px-3 py-2 text-sm cursor-text
          ${isOpen ? "ring-2 ring-indigo-500 border-indigo-500" : ""}
          ${!value && !query ? "text-gray-400" : ""}`}
      >
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : (selectedPlayer
            ? `${selectedPlayer.nickname}${selectedPlayer.realName ? ` (${selectedPlayer.realName})` : ""}`
            : "")}
          onChange={handleInputChange}
          onFocus={() => { setIsOpen(true); setQuery(""); }}
          onKeyDown={handleKeyDown}
          placeholder={selectedPlayer ? selectedPlayer.nickname : placeholder}
          className="flex-1 outline-none bg-transparent min-w-0"
        />
        {value && (
          <button onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 rounded text-gray-400 shrink-0 ml-1">
            <X size={14} />
          </button>
        )}
        <ChevronDown size={14} className={`text-gray-400 shrink-0 ml-1 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && (
        <ul ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">Ничего не найдено</li>
          ) : (
            filtered.map((p, idx) => {
              const isDisabled = disabledIds.includes(p.id);
              const isHighlighted = idx === highlightIndex;
              const isSelected = p.id === value;
              return (
                <li
                  key={p.id}
                  onClick={() => !isDisabled && handleSelect(p.id)}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between
                    ${isHighlighted ? "bg-indigo-50" : ""}
                    ${isDisabled ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-50"}
                    ${isSelected && !isDisabled ? "font-medium text-indigo-600" : ""}`}
                >
                  <span>
                    {p.nickname}
                    {p.realName ? <span className="text-gray-400 ml-1">({p.realName})</span> : ""}
                  </span>
                  {isDisabled && <span className="text-xs text-gray-300">уже выбран</span>}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
