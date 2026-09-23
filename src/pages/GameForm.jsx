import { useState, useEffect, useMemo, useCallback } from "react";
import { ArrowLeft, Check, Loader } from "lucide-react";
import { compareGamesDesc } from "../lib/utils";
import { createGame, updateGame, createTournament } from "../lib/queries";
import {
  SEAT_COUNT, emptySeats, today, acceptBonusInput, toggleBonusSign,
  buildGamePlayers, rolesAreValid, nextGameNumber,
} from "./gameForm/gameFormLogic";
import { useGameDraft } from "./gameForm/useGameDraft";
import { TournamentPicker } from "./gameForm/TournamentPicker";
import { StepProgress, STEP_COUNT } from "./gameForm/StepProgress";
import { SeatsStep } from "./gameForm/SeatsStep";
import { RolesStep } from "./gameForm/RolesStep";
import { ScoresStep } from "./gameForm/ScoresStep";

const NO_BEST_MOVES = [null, null, null];

// Замена одного элемента массива — для полей по местам
const replaceAt = (list, idx, value) => list.map((item, i) => (i === idx ? value : item));

export function GameForm({ players, games, currentSeasonId, currentSeason, navigate, editingGame, showToast, refreshAfterGameWrite, tournaments, refreshTournaments }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  // id новой игры — заранее, чтобы повторное нажатие «Сохранить» после
  // потерянного ответа не создало вторую такую же игру
  const [newGameId] = useState(() => crypto.randomUUID());

  // Турнир
  const [tournamentId, setTournamentId] = useState("");
  const [newTournamentMode, setNewTournamentMode] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newTournamentDate, setNewTournamentDate] = useState(today);

  // Шаг 1: рассадка
  const [seats, setSeats] = useState(emptySeats);

  // Шаг 2: роли и победитель
  const [roles, setRoles] = useState(() => Array(SEAT_COUNT).fill(""));
  const [winner, setWinner] = useState("");

  // Шаг 3: баллы и детали игры
  const [bonusScores, setBonusScores] = useState(() => Array(SEAT_COUNT).fill("0"));
  const [bonusComments, setBonusComments] = useState(() => Array(SEAT_COUNT).fill(""));
  const [notes, setNotes] = useState("");
  const [gameDate, setGameDate] = useState(today);
  const [firstKilled, setFirstKilled] = useState(null);
  const [bestMoves, setBestMoves] = useState(NO_BEST_MOVES);

  const trackFirstKill = Boolean(currentSeason?.trackFirstKill);
  const trackBestMove = Boolean(currentSeason?.trackBestMove);

  // --- Черновик новой игры ---
  const draftValues = useMemo(() => ({
    step, tournamentId, newTournamentMode, newTournamentName, newTournamentDate,
    seats, roles, winner, bonusScores, bonusComments, notes, gameDate, firstKilled,
    bestMoveSeat1: bestMoves[0],
    bestMoveSeat2: bestMoves[1],
    bestMoveSeat3: bestMoves[2],
  }), [step, tournamentId, newTournamentMode, newTournamentName, newTournamentDate,
    seats, roles, winner, bonusScores, bonusComments, notes, gameDate, firstKilled, bestMoves]);

  const restoreDraft = useCallback((draft) => {
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
    setBestMoves([draft.bestMoveSeat1 ?? null, draft.bestMoveSeat2 ?? null, draft.bestMoveSeat3 ?? null]);
  }, []);

  const draft = useGameDraft({
    key: `gameform-draft-${currentSeasonId}`,
    enabled: !editingGame,
    values: draftValues,
    restore: restoreDraft,
  });

  // --- Редактирование: заполнить форму данными игры ---
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
    setBestMoves([
      editingGame.bestMoveSeat1 ?? null,
      editingGame.bestMoveSeat2 ?? null,
      editingGame.bestMoveSeat3 ?? null,
    ]);
  }, [editingGame]);

  // Активные игроки + неактивные, уже сидевшие в редактируемой игре
  const activePlayers = useMemo(() => {
    const active = players.filter((p) => p.isActive);
    if (!editingGame) return active;
    const gamePlayerIds = editingGame.players.map((gp) => gp.playerId);
    const inactiveInGame = players.filter((p) => !p.isActive && gamePlayerIds.includes(p.id));
    return [...active, ...inactiveInGame];
  }, [players, editingGame]);

  const getPlayerName = (id) => players.find((p) => p.id === id)?.nickname || "—";

  const stepValid = {
    1: seats.every((s) => s.playerId),
    2: rolesAreValid(roles) && Boolean(winner),
  };

  // --- Обработчики полей ---
  const copyLastGame = () => {
    const lastGame = [...games].sort(compareGamesDesc)[0];
    if (!lastGame) return;
    const sorted = [...lastGame.players].sort((a, b) => a.seat - b.seat);
    setSeats(sorted.map((p) => ({ seat: p.seat, playerId: p.playerId })));
  };

  const handleBonusChange = (idx, value) => {
    // Значения вне диапазона −5…+5 молча не принимаются
    if (acceptBonusInput(value)) setBonusScores((prev) => replaceAt(prev, idx, value));
  };

  const toggleFirstKilled = (playerId) => {
    if (firstKilled === playerId) {
      setFirstKilled(null);
      setBestMoves(NO_BEST_MOVES);
    } else {
      setFirstKilled(playerId);
    }
  };

  // --- Сохранение ---
  const handleSave = async () => {
    const gamePlayers = buildGamePlayers({ seats, roles, winner, bonusScores, bonusComments });
    const details = {
      date: new Date(gameDate).toISOString(),
      winner,
      players: gamePlayers,
      notes: notes.trim() || null,
      firstKilled: trackFirstKill ? firstKilled : null,
      bestMoveSeat1: trackBestMove && firstKilled ? bestMoves[0] : null,
      bestMoveSeat2: trackBestMove && firstKilled ? bestMoves[1] : null,
      bestMoveSeat3: trackBestMove && firstKilled ? bestMoves[2] : null,
    };

    setSaving(true);
    let saved;
    try {
      let resolvedTournamentId = tournamentId || null;
      if (newTournamentMode && newTournamentName.trim()) {
        const t = await createTournament({
          seasonId: currentSeasonId,
          name: newTournamentName.trim(),
          date: newTournamentDate,
        });
        resolvedTournamentId = t.id;
        // Турнир уже создан: если игра не сохранится, повторное нажатие
        // возьмёт его, а не создаст второй с тем же названием
        setTournamentId(t.id);
        setNewTournamentMode(false);
        refreshTournaments?.();
      }

      saved = editingGame
        ? await updateGame({ id: editingGame.id, tournamentId: resolvedTournamentId, ...details })
        : await createGame({
          newId: newGameId,
          seasonId: currentSeasonId,
          tournamentId: resolvedTournamentId,
          gameNumber: nextGameNumber(games),
          ...details,
        });
    } catch (err) {
      console.error("Failed to save game:", err);
      showToast?.("Ошибка сохранения: " + (err.message || "неизвестная ошибка"), "error");
      setSaving(false);
      return;
    }

    // Игра в базе — дальше ошибки уже не «ошибка сохранения»
    if (!editingGame) draft.clear();
    let seasonGames = null;
    try {
      seasonGames = await refreshAfterGameWrite();
    } catch (err) {
      console.error("Failed to refresh after save:", err);
    }
    setSaving(false);

    // Номер новой игры назначает сервер
    const number = editingGame?.gameNumber ?? seasonGames?.find((g) => g.id === saved.id)?.gameNumber;
    const title = editingGame ? "Игра обновлена" : number ? `Игра #${number} сохранена` : "Игра сохранена";
    if (saved.eloError) {
      showToast?.(`${title}, но ELO не пересчитан: ${saved.eloError.message}. Настройки → «Пересчитать ELO»`, "warning");
    } else if (!seasonGames) {
      showToast?.(`${title}, но список не обновился — обновите страницу`, "warning");
    } else {
      showToast?.(title);
    }

    if (editingGame) navigate("gameDetail", editingGame.id, { replace: true });
    else navigate("games", null, { replace: true });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate("games")}
          className="p-1.5 hover:bg-indigo-500/5 rounded transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold gradient-text">
          {editingGame ? `Редактирование игры №${editingGame.gameNumber}` : "Новая игра"}
        </h2>
      </div>

      <TournamentPicker
        tournaments={tournaments}
        tournamentId={tournamentId}
        onTournamentChange={setTournamentId}
        newMode={newTournamentMode}
        onNewModeChange={setNewTournamentMode}
        newName={newTournamentName}
        onNewNameChange={setNewTournamentName}
        newDate={newTournamentDate}
        onNewDateChange={setNewTournamentDate}
      />

      <StepProgress step={step} onStepClick={setStep} />

      {step === 1 && (
        <SeatsStep
          seats={seats}
          onSeatChange={(idx, playerId) => setSeats((prev) => replaceAt(prev, idx, { ...prev[idx], playerId }))}
          activePlayers={activePlayers}
          onCopyLastGame={!editingGame && games.length > 0 ? copyLastGame : undefined}
        />
      )}

      {step === 2 && (
        <RolesStep
          seats={seats}
          roles={roles}
          onRoleChange={(idx, role) => setRoles((prev) => replaceAt(prev, idx, role))}
          onRolesChange={setRoles}
          winner={winner}
          onWinnerChange={setWinner}
          getPlayerName={getPlayerName}
        />
      )}

      {step === 3 && (
        <ScoresStep
          seats={seats}
          roles={roles}
          winner={winner}
          bonusScores={bonusScores}
          bonusComments={bonusComments}
          onBonusChange={handleBonusChange}
          onToggleSign={(idx) => setBonusScores((prev) => replaceAt(prev, idx, toggleBonusSign(prev[idx])))}
          onCommentChange={(idx, value) => setBonusComments((prev) => replaceAt(prev, idx, value))}
          getPlayerName={getPlayerName}
          trackFirstKill={trackFirstKill}
          trackBestMove={trackBestMove}
          firstKilled={firstKilled}
          onFirstKilledToggle={toggleFirstKilled}
          bestMoves={bestMoves}
          onBestMoveChange={(i, seat) => setBestMoves((prev) => replaceAt(prev, i, seat))}
          gameDate={gameDate}
          onGameDateChange={setGameDate}
          notes={notes}
          onNotesChange={setNotes}
        />
      )}

      <div className="flex justify-between mt-4">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)}
            className="flex items-center gap-1 px-4 py-2 btn-ghost cursor-pointer text-sm">
            <ArrowLeft size={16} /> Назад
          </button>
        ) : (
          <div />
        )}
        {step < STEP_COUNT ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!stepValid[step]}
            className="flex items-center gap-1 px-4 py-2 btn-gradient cursor-pointer disabled:bg-slate-800/30 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm"
          >
            Далее
          </button>
        ) : (
          <button onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800/30 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm">
            {saving ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? "Сохранение..." : "Сохранить игру"}
          </button>
        )}
      </div>
    </div>
  );
}
