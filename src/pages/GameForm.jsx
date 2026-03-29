import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Check, Users, X, AlertTriangle, Shield, Sword, Loader, Scale } from "lucide-react";
import { Badge, PlayerSelect } from "../components/ui";
import { ROLE_NAMES, ROLE_OPTIONS, ROLE_REQUIRED, ROLE_BADGE_VARIANT, RESULT_NAMES } from "../lib/constants";
import { getTeam } from "../lib/utils";
import { createGame, updateGame, createTournament } from "../lib/queries";

export function GameForm({ players, games, currentSeasonId, currentSeason, navigate, editingGame, showToast, refreshGames, refreshAllGames, tournaments, refreshTournaments }) {
  const DRAFT_KEY = `gameform-draft-${currentSeasonId}`;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Tournament selection
  const [tournamentId, setTournamentId] = useState("");
  const [newTournamentMode, setNewTournamentMode] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newTournamentDate, setNewTournamentDate] = useState(new Date().toISOString().split("T")[0]);

  // Step 1: seats
  const initSeats = () => Array.from({ length: 10 }, (_, i) => ({ seat: i + 1, playerId: "" }));
  const [seats, setSeats] = useState(initSeats);

  // Step 2: roles + winner
  const [roles, setRoles] = useState(Array(10).fill(""));
  const [winner, setWinner] = useState("");

  // Step 3: bonuses
  const [bonusScores, setBonusScores] = useState(Array(10).fill("0"));
  const [bonusComments, setBonusComments] = useState(Array(10).fill(""));
  const [notes, setNotes] = useState("");
  const [gameDate, setGameDate] = useState(new Date().toISOString().split("T")[0]);
  const [firstKilled, setFirstKilled] = useState(null);
  const [bestMoveSeat1, setBestMoveSeat1] = useState(null);
  const [bestMoveSeat2, setBestMoveSeat2] = useState(null);
  const [bestMoveSeat3, setBestMoveSeat3] = useState(null);

  // Restore draft on mount (only for new games)
  useEffect(() => {
    if (editingGame) return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (window.confirm("Восстановить предыдущую форму?")) {
          if (draft.step) setStep(draft.step);
          if (draft.tournamentId) setTournamentId(draft.tournamentId);
          if (draft.newTournamentMode !== undefined) setNewTournamentMode(draft.newTournamentMode);
          if (draft.newTournamentName) setNewTournamentName(draft.newTournamentName);
          if (draft.newTournamentDate) setNewTournamentDate(draft.newTournamentDate);
          if (draft.seats) setSeats(draft.seats);
          if (draft.roles) setRoles(draft.roles);
          if (draft.winner) setWinner(draft.winner);
          if (draft.bonusScores) setBonusScores(draft.bonusScores);
          if (draft.bonusComments) setBonusComments(draft.bonusComments);
          if (draft.notes) setNotes(draft.notes);
          if (draft.gameDate) setGameDate(draft.gameDate);
          if (draft.firstKilled) setFirstKilled(draft.firstKilled);
          if (draft.bestMoveSeat1 != null) setBestMoveSeat1(draft.bestMoveSeat1);
          if (draft.bestMoveSeat2 != null) setBestMoveSeat2(draft.bestMoveSeat2);
          if (draft.bestMoveSeat3 != null) setBestMoveSeat3(draft.bestMoveSeat3);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill for editing
  useEffect(() => {
    if (!editingGame) return;
    const sorted = [...editingGame.players].sort((a, b) => a.seat - b.seat);
    setSeats(sorted.map((p) => ({ seat: p.seat, playerId: p.playerId })));
    setRoles(sorted.map((p) => p.role));
    setWinner(editingGame.winner);
    setBonusScores(sorted.map((p) => String(p.bonusScore)));
    setBonusComments(sorted.map((p) => p.bonusComment || ""));
    setNotes(editingGame.notes || "");
    setGameDate(editingGame.date.split("T")[0]);
    setTournamentId(editingGame.tournamentId || "");
    setFirstKilled(editingGame.firstKilled || null);
    setBestMoveSeat1(editingGame.bestMoveSeat1 ?? null);
    setBestMoveSeat2(editingGame.bestMoveSeat2 ?? null);
    setBestMoveSeat3(editingGame.bestMoveSeat3 ?? null);
  }, [editingGame]);

  // Auto-save draft on changes (debounced)
  useEffect(() => {
    if (editingGame) return;
    const timer = setTimeout(() => {
      const draft = {
        step,
        tournamentId,
        newTournamentMode,
        newTournamentName,
        newTournamentDate,
        seats,
        roles,
        winner,
        bonusScores,
        bonusComments,
        notes,
        gameDate,
        firstKilled,
        bestMoveSeat1,
        bestMoveSeat2,
        bestMoveSeat3,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, 500);
    return () => clearTimeout(timer);
  }, [editingGame, step, tournamentId, newTournamentMode, newTournamentName, newTournamentDate, seats, roles, winner, bonusScores, bonusComments, notes, gameDate, firstKilled, bestMoveSeat1, bestMoveSeat2, bestMoveSeat3, DRAFT_KEY]);

  const activePlayers = useMemo(() => {
    const active = players.filter((p) => p.isActive);
    if (!editingGame) return active;
    const gamePlayerIds = editingGame.players.map((gp) => gp.playerId);
    const inactiveInGame = players.filter(
      (p) => !p.isActive && gamePlayerIds.includes(p.id)
    );
    return [...active, ...inactiveInGame];
  }, [players, editingGame]);

  const selectedIds = useMemo(
    () => seats.map((s) => s.playerId).filter(Boolean),
    [seats]
  );

  // --- Step 1 validation ---
  const step1Valid = seats.every((s) => s.playerId);

  // --- Step 2 validation ---
  const roleCounts = useMemo(() => {
    const c = { citizen: 0, sheriff: 0, mafia: 0, don: 0 };
    roles.forEach((r) => { if (r) c[r]++; });
    return c;
  }, [roles]);

  const rolesComplete = roles.every((r) => r);
  const rolesValid = Object.keys(ROLE_REQUIRED).every(
    (r) => roleCounts[r] === ROLE_REQUIRED[r]
  );
  const step2Valid = rolesComplete && rolesValid && !!winner;

  // --- Helpers ---
  const getPlayerName = (id) => {
    const p = players.find((x) => x.id === id);
    return p?.nickname || "\u2014";
  };

  const handleSeatChange = (idx, playerId) => {
    setSeats((prev) => prev.map((s, i) => (i === idx ? { ...s, playerId } : s)));
  };

  const handleRoleChange = (idx, role) => {
    setRoles((prev) => prev.map((r, i) => (i === idx ? role : r)));
  };

  const handleBonusChange = (idx, value) => {
    // Allow empty string, "-", ".", "-." (partial typing)
    if (value === "" || value === "-" || value === "." || value === "-." || value === ",") {
      setBonusScores((prev) => prev.map((b, i) => (i === idx ? value : b)));
      return;
    }
    // Parse and validate range -5 to +5
    const normalized = value.replace(",", ".");
    const n = parseFloat(normalized);
    if (!isNaN(n) && n >= -5 && n <= 5) {
      setBonusScores((prev) => prev.map((b, i) => (i === idx ? value : b)));
    }
    // Otherwise reject silently (don't update state)
  };

  const handleBonusCommentChange = (idx, value) => {
    setBonusComments((prev) => prev.map((c, i) => (i === idx ? value : c)));
  };

  const parseBonusScore = (val) => {
    if (val === "" || val === "-" || val === "." || val === "-." || val === ",") return 0;
    const normalized = val.replace(",", ".");
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  };

  const isBonusInvalid = (val) => {
    if (!val || val === "" || val === "-" || val === "." || val === "-." || val === ",") return false;
    const normalized = val.replace(",", ".");
    const n = parseFloat(normalized);
    return isNaN(n) || n < -5 || n > 5;
  };

  // --- Save ---
  const handleSave = async () => {
    const gamePlayers = seats.map((s, idx) => {
      const role = roles[idx];
      const team = getTeam(role);
      const result = winner === "draw" ? "draw" : team === winner ? "win" : "lose";
      const baseScore = result === "win" ? 1 : 0;
      const bonus = parseBonusScore(bonusScores[idx]);
      return {
        playerId: s.playerId,
        seat: s.seat,
        role,
        result,
        baseScore,
        bonusScore: bonus,
        bonusComment: bonusComments[idx].trim() || null,
        totalScore: baseScore + bonus,
      };
    });

    setSaving(true);
    try {
      // Resolve tournament ID (create new if needed)
      let resolvedTournamentId = tournamentId || null;
      if (newTournamentMode && newTournamentName.trim()) {
        const t = await createTournament({
          seasonId: currentSeasonId,
          name: newTournamentName.trim(),
          date: newTournamentDate,
        });
        resolvedTournamentId = t.id;
        refreshTournaments?.();
      }

      if (editingGame) {
        await updateGame({
          id: editingGame.id,
          tournamentId: resolvedTournamentId,
          date: new Date(gameDate).toISOString(),
          winner,
          players: gamePlayers,
          notes: notes.trim() || null,
          firstKilled: currentSeason?.trackFirstKill ? firstKilled : null,
          bestMoveSeat1: currentSeason?.trackBestMove && firstKilled ? bestMoveSeat1 : null,
          bestMoveSeat2: currentSeason?.trackBestMove && firstKilled ? bestMoveSeat2 : null,
          bestMoveSeat3: currentSeason?.trackBestMove && firstKilled ? bestMoveSeat3 : null,
        });
        await refreshGames();
        await refreshAllGames();
        showToast?.("Игра обновлена");
        navigate("gameDetail", editingGame.id);
      } else {
        const gameNumber = games.reduce((max, g) => Math.max(max, g.gameNumber), 0) + 1;
        await createGame({
          seasonId: currentSeasonId,
          tournamentId: resolvedTournamentId,
          gameNumber,
          date: new Date(gameDate).toISOString(),
          winner,
          players: gamePlayers,
          notes: notes.trim() || null,
          firstKilled: currentSeason?.trackFirstKill ? firstKilled : null,
          bestMoveSeat1: currentSeason?.trackBestMove && firstKilled ? bestMoveSeat1 : null,
          bestMoveSeat2: currentSeason?.trackBestMove && firstKilled ? bestMoveSeat2 : null,
          bestMoveSeat3: currentSeason?.trackBestMove && firstKilled ? bestMoveSeat3 : null,
        });
        await refreshGames();
        await refreshAllGames();
        localStorage.removeItem(DRAFT_KEY);
        showToast?.(`Игра #${gameNumber} сохранена`);
        navigate("games");
      }
    } catch (err) {
      console.error("Failed to save game:", err);
      showToast?.("Ошибка сохранения: " + (err.message || "неизвестная ошибка"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate("games")}
          className="p-1.5 hover:bg-indigo-500/5 rounded transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold gradient-text">
          {editingGame ? `Редактирование игры №${editingGame.gameNumber}` : "Новая игра"}
        </h2>
      </div>

      {/* Tournament selection */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">Турнир (игровой вечер)</label>
        {!newTournamentMode ? (
          <select
            value={tournamentId}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setNewTournamentMode(true);
                setTournamentId("");
              } else {
                setTournamentId(e.target.value);
              }
            }}
            className="w-full bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">Без турнира</option>
            {(tournaments || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.date})</option>
            ))}
            <option value="__new__">+ Новый турнир</option>
          </select>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTournamentName}
                onChange={(e) => setNewTournamentName(e.target.value)}
                className="flex-1 bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="Название турнира"
                autoFocus
              />
              <input
                type="date"
                value={newTournamentDate}
                onChange={(e) => setNewTournamentDate(e.target.value)}
                className="bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <button
              onClick={() => { setNewTournamentMode(false); setNewTournamentName(""); }}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              Отмена — выбрать существующий
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-6">
        {[
          { n: 1, label: "Игроки" },
          { n: 2, label: "Роли" },
          { n: 3, label: "Баллы" },
        ].map(({ n, label }, i) => (
          <React.Fragment key={n}>
            <button
              onClick={() => {
                if (n < step) setStep(n);
              }}
              disabled={n > step}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                step === n
                  ? "btn-gradient cursor-pointer"
                  : step > n
                  ? "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 cursor-pointer"
                  : "bg-slate-800/30 text-slate-500"
              }`}
            >
              {step > n ? <Check size={14} /> : <span>{n}</span>}
              <span className="hidden sm:inline ml-1">{label}</span>
            </button>
            {i < 2 && (
              <div className={`flex-1 h-0.5 mx-1 ${step > n ? "bg-indigo-600" : "bg-slate-700"}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Player selection */}
      {step === 1 && (
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Выберите 10 игроков</h3>
            {!editingGame && games.length > 0 && (
              <button
                onClick={() => {
                  const lastGame = [...games].sort((a, b) => b.gameNumber - a.gameNumber)[0];
                  if (!lastGame) return;
                  const sorted = [...lastGame.players].sort((a, b) => a.seat - b.seat);
                  setSeats(sorted.map((p) => ({ seat: p.seat, playerId: p.playerId })));
                }}
                className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium"
              >
                <Users size={14} /> Из предыдущей игры
              </button>
            )}
          </div>
          <div className="space-y-2">
            {seats.map((seat, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-800/30 rounded-full text-sm font-medium text-slate-400 shrink-0">
                  {seat.seat}
                </span>
                <PlayerSelect
                  value={seat.playerId}
                  onChange={(id) => handleSeatChange(idx, id)}
                  players={activePlayers}
                  disabledIds={selectedIds.filter((id) => id !== seat.playerId)}
                />
              </div>
            ))}
          </div>
          {activePlayers.length < 10 && (
            <p className="mt-3 text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle size={14} />
              Нужно минимум 10 активных игроков (сейчас {activePlayers.length})
            </p>
          )}
        </div>
      )}

      {/* Step 2: Roles and winner */}
      {step === 2 && (
        <div className="glass-card rounded-2xl p-4">
          {/* Role counters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {ROLE_OPTIONS.map(({ value, label }) => {
              const count = roleCounts[value];
              const required = ROLE_REQUIRED[value];
              const ok = count === required;
              const over = count > required;
              return (
                <div key={value}
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    over
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : ok
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                      : "bg-slate-800/30 border-indigo-500/15 text-slate-400"
                  }`}
                >
                  {label}: {count}/{required} {ok ? "\u2713" : over ? "\u2717" : ""}
                </div>
              );
            })}
          </div>

          {/* Auto-assign buttons */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                const ROLE_SET = ["citizen","citizen","citizen","citizen","citizen","citizen","sheriff","mafia","mafia","don"];
                const newRoles = [...roles];
                // Find unassigned slots
                const unassigned = [];
                for (let i = 0; i < 10; i++) {
                  if (!newRoles[i]) unassigned.push(i);
                }
                // Figure out what roles are still needed
                const neededRoles = [...ROLE_SET];
                newRoles.forEach(r => {
                  if (r) {
                    const idx = neededRoles.indexOf(r);
                    if (idx !== -1) neededRoles.splice(idx, 1);
                  }
                });
                // Shuffle
                for (let i = neededRoles.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [neededRoles[i], neededRoles[j]] = [neededRoles[j], neededRoles[i]];
                }
                // Assign
                unassigned.forEach((slotIdx, i) => {
                  if (i < neededRoles.length) newRoles[slotIdx] = neededRoles[i];
                });
                setRoles(newRoles);
              }}
              className="px-3 py-1.5 bg-slate-800/30 hover:bg-indigo-500/5 text-slate-300 rounded-lg text-sm transition-colors"
            >
              Заполнить случайно
            </button>
            <button
              type="button"
              onClick={() => setRoles(Array(10).fill(""))}
              className="px-3 py-1.5 bg-slate-800/30 hover:bg-indigo-500/5 text-slate-300 rounded-lg text-sm transition-colors"
            >
              Очистить роли
            </button>
          </div>

          {/* Role assignment */}
          <div className="space-y-2 mb-6">
            {seats.map((seat, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-800/30 rounded-full text-sm font-medium text-slate-400 shrink-0">
                  {seat.seat}
                </span>
                <span className="w-24 text-sm font-medium truncate">{getPlayerName(seat.playerId)}</span>
                <select
                  value={roles[idx]}
                  onChange={(e) => handleRoleChange(idx, e.target.value)}
                  className={`flex-1 bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    !roles[idx] ? "text-slate-500" : ""
                  }`}
                >
                  <option value="">Роль...</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {roles[idx] && (
                  <Badge variant={ROLE_BADGE_VARIANT[roles[idx]]}>
                    {ROLE_NAMES[roles[idx]]}
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Winner selection */}
          <div>
            <h4 className="font-medium mb-2">Победитель</h4>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setWinner("red")}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  winner === "red"
                    ? "border-red-500 bg-red-500/10 text-red-400 shadow-sm"
                    : "border-indigo-500/15 text-slate-500 hover:border-red-500/30 hover:bg-red-500/5"
                }`}
              >
                <Shield size={20} />
                Красные
              </button>
              <button
                onClick={() => setWinner("draw")}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  winner === "draw"
                    ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-sm"
                    : "border-indigo-500/15 text-slate-500 hover:border-amber-500/30 hover:bg-amber-500/5"
                }`}
              >
                <Scale size={20} />
                Ничья
              </button>
              <button
                onClick={() => setWinner("black")}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  winner === "black"
                    ? "border-slate-500 bg-slate-700 text-slate-200 shadow-sm"
                    : "border-indigo-500/15 text-slate-500 hover:border-slate-500 hover:bg-indigo-500/5"
                }`}
              >
                <Sword size={20} />
                Чёрные
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Bonus scores */}
      {step === 3 && (
        <div className="glass-card rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Дополнительные баллы</h3>

          {/* Mobile card view for bonus table */}
          <div className="sm:hidden space-y-3">
            {seats.map((seat, idx) => {
              const role = roles[idx];
              const team = getTeam(role);
              const result = winner === "draw" ? "draw" : team === winner ? "win" : "lose";
              const baseScore = result === "win" ? 1 : 0;
              const bonus = parseBonusScore(bonusScores[idx]);
              const total = baseScore + bonus;

              return (
                <div key={idx} className={`bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3 space-y-2 ${firstKilled === seat.playerId ? "ring-2 ring-red-500/30 bg-red-500/5" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200">
                      {seat.seat}. {getPlayerName(seat.playerId)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={ROLE_BADGE_VARIANT[role]}>{ROLE_NAMES[role]}</Badge>
                      <span className={result === "win" ? "text-emerald-400 text-xs" : result === "draw" ? "text-amber-400 text-xs" : "text-red-400 text-xs"}>
                        {RESULT_NAMES[result]}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
                    <div>База: <span className="text-slate-200">{baseScore}</span></div>
                    <div>
                      Доп.:{" "}
                      <input
                        type="text"
                        inputMode="decimal"
                        value={bonusScores[idx]}
                        onChange={(e) => handleBonusChange(idx, e.target.value)}
                        placeholder="0.0"
                        className={`w-14 bg-slate-800/30 border rounded px-1 py-0.5 text-center text-slate-200 ${
                          isBonusInvalid(bonusScores[idx]) ? "border-red-500" : "border-indigo-500/15"
                        }`}
                      />
                    </div>
                    <div>Итого: <span className="text-slate-200 font-medium">{total % 1 === 0 ? total : total.toFixed(1)}</span></div>
                  </div>
                  <input
                    type="text"
                    placeholder="Комментарий..."
                    value={bonusComments[idx]}
                    onChange={(e) => handleBonusCommentChange(idx, e.target.value)}
                    className="w-full bg-slate-800/30 border border-indigo-500/15 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500"
                  />
                  {currentSeason?.trackFirstKill && (
                    <div className="flex items-center justify-center pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-400">
                        <button
                          type="button"
                          onClick={() => {
                            const isAlready = firstKilled === seat.playerId;
                            setFirstKilled(isAlready ? null : seat.playerId);
                            if (isAlready) {
                              setBestMoveSeat1(null);
                              setBestMoveSeat2(null);
                              setBestMoveSeat3(null);
                            }
                          }}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            firstKilled === seat.playerId
                              ? "border-red-500 bg-red-500"
                              : "border-indigo-500/15 hover:border-red-500/50"
                          }`}
                        >
                          {firstKilled === seat.playerId && (
                            <span className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </button>
                        Первоубиенный
                      </label>
                    </div>
                  )}
                  {currentSeason?.trackBestMove && firstKilled === seat.playerId && (
                    <div className="pt-2 space-y-1.5">
                      <p className="text-xs text-slate-400 text-center">Лучший ход</p>
                      <div className="flex items-center gap-2 justify-center">
                        {[
                          { val: bestMoveSeat1, set: setBestMoveSeat1, others: [bestMoveSeat2, bestMoveSeat3] },
                          { val: bestMoveSeat2, set: setBestMoveSeat2, others: [bestMoveSeat1, bestMoveSeat3] },
                          { val: bestMoveSeat3, set: setBestMoveSeat3, others: [bestMoveSeat1, bestMoveSeat2] },
                        ].map(({ val, set, others }, i) => {
                          const usedByOthers = others.filter(Boolean);
                          return (
                            <select
                              key={i}
                              value={val ?? ""}
                              onChange={(e) => set(e.target.value ? Number(e.target.value) : null)}
                              className="bg-slate-800/50 border border-indigo-500/15 rounded px-1 py-1 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500/50"
                            >
                              <option value="">—</option>
                              {[1,2,3,4,5,6,7,8,9,10]
                                .filter(s => s !== seat.seat)
                                .filter(s => s === val || !usedByOthers.includes(s))
                                .map(s => <option key={s} value={s}>{s}</option>)
                              }
                            </select>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-indigo-500/10 bg-indigo-500/5">
                  <th className="text-left px-2 py-2 font-medium text-slate-400">Место</th>
                  <th className="text-left px-2 py-2 font-medium text-slate-400">Игрок</th>
                  <th className="text-left px-2 py-2 font-medium text-slate-400">Роль</th>
                  <th className="text-left px-2 py-2 font-medium text-slate-400">Результат</th>
                  <th className="text-center px-2 py-2 font-medium text-slate-400">База</th>
                  <th className="text-center px-2 py-2 font-medium text-slate-400">Доп.</th>
                  <th className="text-center px-2 py-2 font-medium text-slate-400">Итого</th>
                  <th className="text-left px-2 py-2 font-medium text-slate-400">Комментарий</th>
                  {currentSeason?.trackFirstKill && (
                    <th className="text-center px-2 py-2 font-medium text-slate-400">ПУ</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {seats.map((seat, idx) => {
                  const role = roles[idx];
                  const team = getTeam(role);
                  const result = winner === "draw" ? "draw" : team === winner ? "win" : "lose";
                  const baseScore = result === "win" ? 1 : 0;
                  const bonus = parseBonusScore(bonusScores[idx]);
                  const total = baseScore + bonus;

                  return (
                    <tr key={idx} className={`border-b border-indigo-500/10 last:border-b-0 ${firstKilled === seat.playerId ? "bg-red-500/10" : ""}`}>
                      <td className="px-2 py-2 text-center font-medium">{seat.seat}</td>
                      <td className="px-2 py-2 font-medium">{getPlayerName(seat.playerId)}</td>
                      <td className="px-2 py-2">
                        <Badge variant={ROLE_BADGE_VARIANT[role]}>{ROLE_NAMES[role]}</Badge>
                      </td>
                      <td className="px-2 py-2">
                        <span className={result === "win" ? "text-emerald-400 font-medium" : result === "draw" ? "text-amber-400 font-medium" : "text-red-400"}>
                          {RESULT_NAMES[result]}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">{baseScore}</td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={bonusScores[idx]}
                          onChange={(e) => handleBonusChange(idx, e.target.value)}
                          placeholder="0.0"
                          className={`w-16 bg-indigo-500/5 border rounded px-2 py-1 text-center text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                            isBonusInvalid(bonusScores[idx]) ? "border-red-500" : "border-indigo-500/15"
                          }`}
                        />
                      </td>
                      <td className="px-2 py-2 text-center font-semibold">
                        {total % 1 === 0 ? total : total.toFixed(1)}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={bonusComments[idx]}
                          onChange={(e) => handleBonusCommentChange(idx, e.target.value)}
                          className="w-full bg-indigo-500/5 border border-indigo-500/15 rounded px-2 py-1 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                          placeholder="—"
                        />
                      </td>
                      {currentSeason?.trackFirstKill && (
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const isAlready = firstKilled === seat.playerId;
                              setFirstKilled(isAlready ? null : seat.playerId);
                              if (isAlready) {
                                setBestMoveSeat1(null);
                                setBestMoveSeat2(null);
                                setBestMoveSeat3(null);
                              }
                            }}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mx-auto ${
                              firstKilled === seat.playerId
                                ? "border-red-500 bg-red-500"
                                : "border-indigo-500/15 hover:border-red-500/50"
                            }`}
                          >
                            {firstKilled === seat.playerId && (
                              <span className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div> {/* End desktop table view */}

          {/* Game date */}
          <div className="mt-4 flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Дата игры</label>
              <input
                type="date"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                className="bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <div className="flex gap-2 mt-1">
                <button type="button"
                  onClick={() => setGameDate(new Date().toISOString().split("T")[0])}
                  className="px-2 py-0.5 bg-slate-800/30 hover:bg-indigo-500/5 text-slate-400 rounded text-xs transition-colors">
                  Сегодня
                </button>
                <button type="button"
                  onClick={() => {
                    const d = new Date(); d.setDate(d.getDate() - 1);
                    setGameDate(d.toISOString().split("T")[0]);
                  }}
                  className="px-2 py-0.5 bg-slate-800/30 hover:bg-indigo-500/5 text-slate-400 rounded text-xs transition-colors">
                  Вчера
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Комментарий к игре
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
              placeholder="Необязательно"
            />
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-4">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)}
            className="flex items-center gap-1 px-4 py-2 btn-ghost cursor-pointer text-sm">
            <ArrowLeft size={16} /> Назад
          </button>
        ) : (
          <div />
        )}
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 1 ? !step1Valid : !step2Valid}
            className="flex items-center gap-1 px-4 py-2 btn-gradient cursor-pointer disabled:bg-slate-800/30 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm"
          >
            Далее
          </button>
        ) : (
          <button onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-red-600 disabled:bg-slate-800/30 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm">
            {saving ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? "Сохранение..." : "Сохранить игру"}
          </button>
        )}
      </div>
    </div>
  );
}
