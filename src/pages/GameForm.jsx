import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ArrowLeft, ArrowRight, Check, FileClock } from "lucide-react";
import { compareGamesDesc, pluralize } from "../lib/utils";
import { createGame, updateGame, createTournament } from "../lib/queries";
import { Button, FormStatus, useFocusFirstError } from "../components/ui";
import {
  SEAT_COUNT, emptySeats, today, acceptBonusInput, toggleBonusSign, isBonusInvalid,
  buildGamePlayers, rolesAreValid, nextGameNumber, swapSeats, STEPS, STEP_COUNT,
} from "./gameForm/gameFormLogic";
import { useGameDraft } from "./gameForm/useGameDraft";
import { TournamentPicker } from "./gameForm/TournamentPicker";
import { StepProgress } from "./gameForm/StepProgress";
import { SeatsStep } from "./gameForm/SeatsStep";
import { RolesStep } from "./gameForm/RolesStep";
import { ScoresStep } from "./gameForm/ScoresStep";

const NO_BEST_MOVES = [null, null, null];

// Замена одного элемента массива — для полей по местам
const replaceAt = (list, idx, value) => list.map((item, i) => (i === idx ? value : item));

const draftTime = (ms) => new Date(ms).toLocaleString("ru-RU", {
  day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
});

export function GameForm({ players, games, currentSeasonId, currentSeason, navigate, editingGame, showToast, refreshAfterGameWrite, tournaments, refreshAllTournaments }) {
  const formRef = useRef(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  // Номер шага, на котором нажали «Далее» с пробелами: подсветить пустое
  const [errorsShownFor, setErrorsShownFor] = useState(0);
  const [attempt, setAttempt] = useState(0);
  useFocusFirstError(formRef, attempt);
  // id новой игры — заранее, чтобы повторное нажатие «Сохранить» после
  // потерянного ответа не создало вторую такую же игру
  const [newGameId] = useState(() => crypto.randomUUID());

  // Вечер: турнир и дата
  const [tournamentId, setTournamentId] = useState("");
  const [newTournamentMode, setNewTournamentMode] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [gameDate, setGameDate] = useState(today);

  // Шаг 1: рассадка
  const [seats, setSeats] = useState(emptySeats);

  // Шаг 2: роли и победитель
  const [roles, setRoles] = useState(() => Array(SEAT_COUNT).fill(""));
  const [winner, setWinner] = useState("");

  // Шаг 3: баллы и детали игры
  const [bonusScores, setBonusScores] = useState(() => Array(SEAT_COUNT).fill("0"));
  const [bonusComments, setBonusComments] = useState(() => Array(SEAT_COUNT).fill(""));
  const [notes, setNotes] = useState("");
  const [firstKilled, setFirstKilled] = useState(null);
  const [bestMoves, setBestMoves] = useState(NO_BEST_MOVES);

  const trackFirstKill = Boolean(currentSeason?.trackFirstKill);
  const trackBestMove = Boolean(currentSeason?.trackBestMove);

  // --- Черновик новой игры ---
  const draftValues = useMemo(() => ({
    step, tournamentId, newTournamentMode, newTournamentName,
    seats, roles, winner, bonusScores, bonusComments, notes, gameDate, firstKilled,
    bestMoveSeat1: bestMoves[0],
    bestMoveSeat2: bestMoves[1],
    bestMoveSeat3: bestMoves[2],
  }), [step, tournamentId, newTournamentMode, newTournamentName,
    seats, roles, winner, bonusScores, bonusComments, notes, gameDate, firstKilled, bestMoves]);

  const formIsEmpty = !seats.some((s) => s.playerId) && !roles.some(Boolean) && !winner
    && !newTournamentName.trim() && !notes.trim();

  const restoreDraft = useCallback((draft) => {
    if (draft.step) setStep(draft.step);
    if (draft.tournamentId) setTournamentId(draft.tournamentId);
    if (draft.newTournamentMode !== undefined) setNewTournamentMode(draft.newTournamentMode);
    if (draft.newTournamentName) setNewTournamentName(draft.newTournamentName);
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
    isEmpty: formIsEmpty,
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

  // --- Что мешает пройти шаг (null — всё заполнено) ---
  const emptySeatCount = seats.filter((s) => !s.playerId).length;
  const emptyRoleCount = roles.filter((r) => !r).length;
  const tournamentNameMissing = newTournamentMode && !newTournamentName.trim();
  const stepProblem = {
    1: emptySeatCount
      ? `Осталось посадить ${emptySeatCount} ${pluralize(emptySeatCount, "игрока", "игроков", "игроков")}`
      : null,
    2: emptyRoleCount
      ? `Не роздано ролей: ${emptyRoleCount}`
      : !rolesAreValid(roles)
      ? "Роли не сходятся: нужно 6 мирных, шериф, 2 мафии и дон"
      : !winner
      ? "Отметьте, кто победил"
      : null,
    3: bonusScores.some(isBonusInvalid)
      ? "Доп. балл — число от −5 до +5, например 0.5 или −1"
      : tournamentNameMissing
      ? "Назовите новый турнир или выберите турнир из списка"
      : null,
  };
  const canOpenStep = (n) => n <= step || STEPS.filter((s) => s.n < n).every((s) => !stepProblem[s.n]);
  const shownProblem = errorsShownFor === step ? stepProblem[step] : null;

  // --- Обработчики полей ---
  const copyLastGame = () => {
    const lastGame = [...games].sort(compareGamesDesc)[0];
    if (!lastGame) return;
    const sorted = [...lastGame.players].sort((a, b) => a.seat - b.seat);
    setSeats(sorted.map((p) => ({ seat: p.seat, playerId: p.playerId })));
  };

  const handleSeatSwap = (from, to) => {
    const next = swapSeats({ seats, roles, bonusScores, bonusComments }, from, to);
    setSeats(next.seats);
    setRoles(next.roles);
    setBonusScores(next.bonusScores);
    setBonusComments(next.bonusComments);
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

  const goToStep = (n) => {
    setStep(n);
    setErrorsShownFor(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = () => {
    if (stepProblem[step]) {
      setErrorsShownFor(step);
      setAttempt((a) => a + 1);
      return;
    }
    goToStep(step + 1);
  };

  // --- Сохранение ---
  const handleSave = async () => {
    setFailure("");
    if (stepProblem[3]) {
      setErrorsShownFor(3);
      setAttempt((a) => a + 1);
      return;
    }
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
          date: gameDate,
        });
        resolvedTournamentId = t.id;
        // Турнир уже создан: если игра не сохранится, повторное нажатие
        // возьмёт его, а не создаст второй с тем же названием
        setTournamentId(t.id);
        setNewTournamentMode(false);
        refreshAllTournaments?.();
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
      // Всё введённое остаётся: можно нажать ещё раз
      setFailure("Игра не сохранилась: " + (err.message || "неизвестная ошибка") + ". Нажмите «Сохранить» ещё раз.");
      setSaving(false);
      return;
    }

    // Игра в базе — дальше ошибки уже не «ошибка сохранения»
    if (!editingGame) draft.clear();
    let freshGames = null;
    try {
      freshGames = await refreshAfterGameWrite();
    } catch (err) {
      console.error("Failed to refresh after save:", err);
    }
    setSaving(false);

    // Номер новой игры назначает сервер
    const number = editingGame?.gameNumber ?? freshGames?.find((g) => g.id === saved.id)?.gameNumber;
    const title = editingGame ? "Игра обновлена" : number ? `Игра №${number} сохранена` : "Игра сохранена";
    if (saved.eloError) {
      showToast?.(`${title}, но ELO не пересчитан: ${saved.eloError.message}. Настройки → «Пересчитать ELO»`, "warning");
    } else if (!freshGames) {
      showToast?.(`${title}, но список не обновился — обновите страницу`, "warning");
    } else {
      showToast?.(title);
    }

    if (editingGame) navigate("gameDetail", editingGame.id, { replace: true });
    else navigate("games", null, { replace: true });
  };

  const isLastStep = step === STEP_COUNT;
  const statusText = failure || shownProblem;

  return (
    <div ref={formRef}>
      <div className="flex items-center gap-3 mb-1">
        <button type="button" aria-label="Назад к играм" onClick={() => navigate("games")}
          className="w-10 h-10 -ml-2 flex items-center justify-center hover:bg-elev-2 rounded-lg transition-colors cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <p className="eyebrow">Шаг {step} из {STEP_COUNT}</p>
          <h2 className="page-title mt-1">
            {editingGame ? `Игра №${editingGame.gameNumber}` : "Новая игра"}
          </h2>
        </div>
      </div>

      {draft.pending && (
        <div className="card mt-4 p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-accent-400/30" role="region" aria-label="Черновик">
          <FileClock size={20} className="text-accent-400 shrink-0 hidden sm:block" aria-hidden="true" />
          <p className="text-sm text-stone-300 flex-1">
            Есть незаконченная игра
            {draft.pending.savedAt ? <> от <span className="text-stone-100">{draftTime(draft.pending.savedAt)}</span></> : null}.
            Продолжить с того же места?
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={draft.discard} className="flex-1 sm:flex-none">Начать заново</Button>
            <Button size="sm" onClick={draft.accept} className="flex-1 sm:flex-none">Продолжить</Button>
          </div>
        </div>
      )}

      <div className="mt-5">
        <TournamentPicker
          tournaments={tournaments}
          tournamentId={tournamentId}
          onTournamentChange={setTournamentId}
          newMode={newTournamentMode}
          onNewModeChange={setNewTournamentMode}
          newName={newTournamentName}
          onNewNameChange={setNewTournamentName}
          nameError={errorsShownFor === 3 && tournamentNameMissing ? "Назовите турнир" : null}
          gameDate={gameDate}
          onGameDateChange={setGameDate}
        />
      </div>

      <StepProgress step={step} onStepClick={goToStep} canOpen={canOpenStep} />

      {step === 1 && (
        <SeatsStep
          seats={seats}
          onSeatChange={(idx, playerId) => setSeats((prev) => replaceAt(prev, idx, { ...prev[idx], playerId }))}
          onSeatSwap={handleSeatSwap}
          activePlayers={activePlayers}
          onCopyLastGame={!editingGame && games.length > 0 ? copyLastGame : undefined}
          showErrors={errorsShownFor === 1}
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
          showErrors={errorsShownFor === 2}
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
          notes={notes}
          onNotesChange={setNotes}
        />
      )}

      {/* Панель действий: на телефоне прилипает над нижней навигацией */}
      <div className="sticky z-30 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4 mt-5">
        <div className="flex items-center gap-3 p-2 pl-4 rounded-2xl border border-line-strong bg-surface-raised/95 backdrop-blur-xl shadow-2xl shadow-black/50">
          <div className="flex-1 min-w-0">
            {statusText ? (
              <FormStatus className="leading-snug">{statusText}</FormStatus>
            ) : (
              <p className="hidden sm:block text-[13px] text-stone-500 truncate">
                {isLastStep ? "Проверьте баллы и сохраните" : `Дальше — ${STEPS[step].label.toLowerCase()}`}
              </p>
            )}
          </div>
          {step > 1 && (
            <Button variant="secondary" icon={ArrowLeft} onClick={() => goToStep(step - 1)} disabled={saving}
              aria-label="Предыдущий шаг" className="!px-3 sm:!px-4">
              <span className="hidden sm:inline">Назад</span>
            </Button>
          )}
          {isLastStep ? (
            <Button icon={Check} loading={saving} onClick={handleSave}>
              {saving ? "Сохраняем…" : editingGame ? "Сохранить" : "Сохранить игру"}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Далее <ArrowRight size={16} aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
