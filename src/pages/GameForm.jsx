import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Check, Users, X, AlertTriangle, Shield, Sword } from "lucide-react";
import { Badge } from "../components/ui";
import { ROLE_NAMES, ROLE_OPTIONS, ROLE_REQUIRED, ROLE_BADGE_VARIANT, RESULT_NAMES } from "../lib/constants";
import { getTeam, generateId } from "../lib/utils";

export function GameForm({ players, games, currentSeasonId, currentSeason, saveGames, navigate, editingGame, showToast }) {
  const [step, setStep] = useState(1);

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
  }, [editingGame]);

  const activePlayers = useMemo(() => {
    const active = players.filter((p) => p.isActive);
    if (!editingGame) return active;
    // Include inactive players who are already in this game
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
    setBonusScores((prev) => prev.map((b, i) => (i === idx ? value : b)));
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

  // --- Save ---
  const handleSave = async () => {
    const gamePlayers = seats.map((s, idx) => {
      const role = roles[idx];
      const team = getTeam(role);
      const result = team === winner ? "win" : "lose";
      const baseScore = result === "win" ? 1 : 0;
      const bonus = parseBonusScore(bonusScores[idx]);
      console.log(`Seat ${s.seat}: bonus input="${bonusScores[idx]}", parsed=${bonus}, comment="${bonusComments[idx]}"`);
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

    let updatedGames;
    if (editingGame) {
      const updatedGame = {
        ...editingGame,
        date: new Date(gameDate).toISOString(),
        winner,
        players: gamePlayers,
        notes: notes.trim() || null,
      };
      updatedGames = games.map((g) => (g.id === editingGame.id ? updatedGame : g));
    } else {
      const gameNumber = games.reduce((max, g) => Math.max(max, g.gameNumber), 0) + 1;
      const newGame = {
        id: generateId(),
        seasonId: currentSeasonId,
        gameNumber,
        date: new Date(gameDate).toISOString(),
        winner,
        players: gamePlayers,
        notes: notes.trim() || null,
        createdAt: new Date().toISOString(),
      };
      updatedGames = [...games, newGame];
    }

    await saveGames(updatedGames);
    if (editingGame) {
      showToast?.("\u0418\u0433\u0440\u0430 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0430");
      navigate("gameDetail", editingGame.id);
    } else {
      const num = updatedGames[updatedGames.length - 1].gameNumber;
      showToast?.(`\u0418\u0433\u0440\u0430 #${num} \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0430`);
      navigate("games");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate("games")}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold">
          {editingGame ? `\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0438\u0433\u0440\u044b \u2116${editingGame.gameNumber}` : "\u041d\u043e\u0432\u0430\u044f \u0438\u0433\u0440\u0430"}
        </h2>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-6">
        {[
          { n: 1, label: "\u0418\u0433\u0440\u043e\u043a\u0438" },
          { n: 2, label: "\u0420\u043e\u043b\u0438" },
          { n: 3, label: "\u0411\u0430\u043b\u043b\u044b" },
        ].map(({ n, label }, i) => (
          <React.Fragment key={n}>
            <button
              onClick={() => {
                if (n < step) setStep(n);
              }}
              disabled={n > step}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                step === n
                  ? "bg-indigo-600 text-white"
                  : step > n
                  ? "bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step > n ? <Check size={14} /> : <span>{n}</span>}
              {label}
            </button>
            {i < 2 && (
              <div className={`flex-1 h-0.5 mx-1 ${step > n ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Player selection */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 10 \u0438\u0433\u0440\u043e\u043a\u043e\u0432</h3>
            {!editingGame && games.length > 0 && (
              <button
                onClick={() => {
                  const lastGame = [...games].sort((a, b) => b.gameNumber - a.gameNumber)[0];
                  if (!lastGame) return;
                  const sorted = [...lastGame.players].sort((a, b) => a.seat - b.seat);
                  setSeats(sorted.map((p) => ({ seat: p.seat, playerId: p.playerId })));
                }}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Users size={14} /> \u0418\u0437 \u043f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0435\u0439 \u0438\u0433\u0440\u044b
              </button>
            )}
          </div>
          <div className="space-y-2">
            {seats.map((seat, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-sm font-medium text-gray-600 shrink-0">
                  {seat.seat}
                </span>
                <select
                  value={seat.playerId}
                  onChange={(e) => handleSeatChange(idx, e.target.value)}
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
                    !seat.playerId ? "text-gray-400" : ""
                  }`}
                >
                  <option value="">\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0433\u0440\u043e\u043a\u0430...</option>
                  {activePlayers.map((p) => {
                    const taken = selectedIds.includes(p.id) && p.id !== seat.playerId;
                    return (
                      <option key={p.id} value={p.id} disabled={taken}>
                        {p.nickname}{p.realName ? ` (${p.realName})` : ""}{taken ? " \u2014 \u0443\u0436\u0435 \u0432\u044b\u0431\u0440\u0430\u043d" : ""}
                      </option>
                    );
                  })}
                </select>
                {seat.playerId && (
                  <button onClick={() => handleSeatChange(idx, "")}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {activePlayers.length < 10 && (
            <p className="mt-3 text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle size={14} />
              \u041d\u0443\u0436\u043d\u043e \u043c\u0438\u043d\u0438\u043c\u0443\u043c 10 \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u0438\u0433\u0440\u043e\u043a\u043e\u0432 (\u0441\u0435\u0439\u0447\u0430\u0441 {activePlayers.length})
            </p>
          )}
        </div>
      )}

      {/* Step 2: Roles and winner */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
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
                      ? "bg-red-50 border-red-300 text-red-700"
                      : ok
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "bg-gray-50 border-gray-200 text-gray-600"
                  }`}
                >
                  {label}: {count}/{required} {ok ? "\u2713" : over ? "\u2717" : ""}
                </div>
              );
            })}
          </div>

          {/* Role assignment */}
          <div className="space-y-2 mb-6">
            {seats.map((seat, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-sm font-medium text-gray-600 shrink-0">
                  {seat.seat}
                </span>
                <span className="w-24 text-sm font-medium truncate">{getPlayerName(seat.playerId)}</span>
                <select
                  value={roles[idx]}
                  onChange={(e) => handleRoleChange(idx, e.target.value)}
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
                    !roles[idx] ? "text-gray-400" : ""
                  }`}
                >
                  <option value="">\u0420\u043e\u043b\u044c...</option>
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
            <h4 className="font-medium mb-2">\u041f\u043e\u0431\u0435\u0434\u0438\u0442\u0435\u043b\u044c</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setWinner("red")}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  winner === "red"
                    ? "border-red-500 bg-red-50 text-red-700 shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-red-200 hover:bg-red-50"
                }`}
              >
                <Shield size={20} />
                \u041a\u0440\u0430\u0441\u043d\u044b\u0435
              </button>
              <button
                onClick={() => setWinner("black")}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  winner === "black"
                    ? "border-gray-700 bg-gray-800 text-white shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-gray-400 hover:bg-gray-100"
                }`}
              >
                <Sword size={20} />
                \u0427\u0451\u0440\u043d\u044b\u0435
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Bonus scores */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold mb-3">\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0431\u0430\u043b\u043b\u044b</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-2 py-2 font-medium text-gray-500">\u041c\u0435\u0441\u0442\u043e</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-500">\u0418\u0433\u0440\u043e\u043a</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-500">\u0420\u043e\u043b\u044c</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-500">\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442</th>
                  <th className="text-center px-2 py-2 font-medium text-gray-500">\u0411\u0430\u0437\u0430</th>
                  <th className="text-center px-2 py-2 font-medium text-gray-500">\u0414\u043e\u043f.</th>
                  <th className="text-center px-2 py-2 font-medium text-gray-500">\u0418\u0442\u043e\u0433\u043e</th>
                  <th className="text-left px-2 py-2 font-medium text-gray-500">\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439</th>
                </tr>
              </thead>
              <tbody>
                {seats.map((seat, idx) => {
                  const role = roles[idx];
                  const team = getTeam(role);
                  const result = team === winner ? "win" : "lose";
                  const baseScore = result === "win" ? 1 : 0;
                  const bonus = parseBonusScore(bonusScores[idx]);
                  const total = baseScore + bonus;

                  return (
                    <tr key={idx} className="border-b last:border-b-0">
                      <td className="px-2 py-2 text-center font-medium">{seat.seat}</td>
                      <td className="px-2 py-2 font-medium">{getPlayerName(seat.playerId)}</td>
                      <td className="px-2 py-2">
                        <Badge variant={ROLE_BADGE_VARIANT[role]}>{ROLE_NAMES[role]}</Badge>
                      </td>
                      <td className="px-2 py-2">
                        <span className={result === "win" ? "text-green-600 font-medium" : "text-red-500"}>
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
                          className="w-16 border rounded px-2 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-indigo-500"
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
                          className="w-full border rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="\u2014"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Game date */}
          <div className="mt-4 flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">\u0414\u0430\u0442\u0430 \u0438\u0433\u0440\u044b</label>
              <input
                type="date"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              \u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u043a \u0438\u0433\u0440\u0435
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="\u041d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e"
            />
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-4">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)}
            className="flex items-center gap-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
            <ArrowLeft size={16} /> \u041d\u0430\u0437\u0430\u0434
          </button>
        ) : (
          <div />
        )}
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 1 ? !step1Valid : !step2Valid}
            className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm"
          >
            \u0414\u0430\u043b\u0435\u0435
          </button>
        ) : (
          <button onClick={handleSave}
            className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">
            <Check size={16} /> \u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0438\u0433\u0440\u0443
          </button>
        )}
      </div>
    </div>
  );
}
