import { useState, useRef, useEffect, useMemo, useId } from "react";
import { X, ChevronDown } from "lucide-react";

export function PlayerSelect({ value, onChange, players, disabledIds = [], placeholder = "Выберите игрока", invalid = false, ariaLabel }) {
  const listId = useId();
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
        className={`input flex items-center !py-0 !pr-1.5 cursor-text ${!value && !query ? "text-stone-500" : ""}`}
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
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-activedescendant={isOpen && filtered[highlightIndex] ? `${listId}-${highlightIndex}` : undefined}
          autoComplete="off"
          placeholder={selectedPlayer ? selectedPlayer.nickname : placeholder}
          className="flex-1 outline-none bg-transparent min-w-0 py-2 text-stone-100 placeholder-stone-500"
        />
        {value && (
          <button type="button" aria-label="Очистить место" onClick={handleClear}
            className="w-8 h-8 flex items-center justify-center hover:bg-elev-3 hover:text-stone-200 rounded-md text-stone-500 shrink-0 cursor-pointer">
            <X size={14} />
          </button>
        )}
        <ChevronDown size={16} aria-hidden="true" className={`text-stone-500 shrink-0 mx-1.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && (
        <ul ref={listRef} id={listId} role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 p-1 bg-surface-raised border border-line-strong rounded-xl shadow-2xl shadow-black/60 max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-stone-500">Никого с таким ником — добавьте игрока на странице «Игроки»</li>
          ) : (
            filtered.map((p, idx) => {
              const isDisabled = disabledIds.includes(p.id);
              const isHighlighted = idx === highlightIndex;
              const isSelected = p.id === value;
              return (
                <li
                  key={p.id}
                  id={`${listId}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isDisabled || undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => !isDisabled && handleSelect(p.id)}
                  className={`px-3 min-h-[40px] rounded-lg text-sm cursor-pointer flex items-center justify-between gap-2
                    ${isHighlighted ? "bg-elev-3" : ""}
                    ${isDisabled ? "text-stone-500 cursor-not-allowed" : "text-stone-200 hover:bg-elev-2"}
                    ${isSelected && !isDisabled ? "font-medium text-accent-300" : ""}`}
                >
                  <span>
                    {p.nickname}
                    {p.realName ? <span className="text-stone-500 ml-1">({p.realName})</span> : ""}
                  </span>
                  {isDisabled && <span className="text-xs text-stone-500 shrink-0">уже за столом</span>}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
