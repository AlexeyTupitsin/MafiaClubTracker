import { useState } from "react";
import { ArrowLeft, Pencil, Trash2, Sword, Check, X } from "lucide-react";
import { BackButton, Badge, Button, ConfirmDialog, EmptyState, PlayerAvatar } from "../components/ui";
import { ROLE_NAMES, ROLE_BADGE_VARIANT } from "../lib/constants";
import { getTeam, formatDate } from "../lib/utils";
import { AdminOnly } from "../components/auth/AuthGuard";
import { EloCell } from "../components/EloCell";
import { deleteGame } from "../lib/queries";
import { ShareImageButton } from "../components/share/ShareImageButton";
import { renderGameCard } from "../lib/shareImage/gameCard";
import { useMe } from "../hooks/useMe";

export function GameDetail({ game, players, navigate, showToast, refreshAfterGameWrite, tournaments, goBack }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [meId] = useMe();

  if (!game) {
    return (
      <EmptyState
        icon={Sword}
        title="Игра не найдена"
        action={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => goBack()}>
            Назад
          </Button>
        }
      />
    );
  }

  const handleDelete = async () => {
    const num = game.gameNumber;
    let eloError;
    try {
      ({ eloError } = await deleteGame(game.id));
    } catch (err) {
      console.error("Failed to delete game:", err);
      showToast?.("Ошибка удаления: " + (err.message || "неизвестная ошибка"), "error");
      return;
    }

    // Игра удалена — ошибки ниже уже не «ошибка удаления»
    let refreshed = true;
    try {
      await refreshAfterGameWrite();
    } catch (err) {
      console.error("Failed to refresh after delete:", err);
      refreshed = false;
    }
    if (eloError) {
      showToast?.(`Игра #${num} удалена, но ELO не пересчитан: ${eloError.message}. Настройки → «Пересчитать ELO»`, "warning");
    } else if (!refreshed) {
      showToast?.(`Игра #${num} удалена, но список не обновился — обновите страницу`, "warning");
    } else {
      showToast?.(`Игра #${num} удалена`);
    }
    navigate("games", null, { replace: true });
  };

  const sortedPlayers = [...game.players].sort((a, b) => a.seat - b.seat);

  const bestMoveSeats = [game.bestMoveSeat1, game.bestMoveSeat2, game.bestMoveSeat3].filter((s) => s != null);
  const firstKilledPlayer = players.find((p) => p.id === game.firstKilled);
  const bestMoveDetails = bestMoveSeats.map((seat) => {
    const gp = sortedPlayers.find((p) => p.seat === seat);
    const player = players.find((p) => p.id === gp?.playerId);
    const isBlack = gp?.role === "mafia" || gp?.role === "don";
    return { seat, gp, player, isBlack };
  });
  const bestMoveCorrectCount = bestMoveDetails.filter((e) => e.isBlack).length;
  const tournamentName = (tournaments || []).find((t) => t.id === game.tournamentId)?.name ?? null;

  const renderShareImage = () => renderGameCard({
    gameNumber: game.gameNumber,
    date: formatDate(game.date),
    tournamentName,
    winner: game.winner,
    rows: sortedPlayers.map((gp) => ({
      ...gp,
      nickname: players.find((p) => p.id === gp.playerId)?.nickname ?? "?",
    })),
    firstKilledNickname: firstKilledPlayer?.nickname ?? null,
    bestMoveSeats,
    hasElo: sortedPlayers.some((gp) => gp.eloDelta != null),
  });

  const verdict = game.winner === "draw"
    ? { text: "Ничья", cls: "text-amber-300", bar: "bg-amber-400" }
    : game.winner === "red"
    ? { text: "Победа красных", cls: "text-red-400", bar: "bg-red-500" }
    : { text: "Победа чёрных", cls: "text-stone-100", bar: "bg-stone-400" };
  const fmt = (v) => (v % 1 === 0 ? v : v.toFixed(1));
  const STICKY_EDGE = "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-line md:after:hidden";

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-start gap-3">
        <BackButton onClick={() => goBack()} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow truncate">
            {formatDate(game.date)}{tournamentName ? ` · ${tournamentName}` : ""}
          </p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-1.5">
            <h2 className="page-title">Игра #{game.gameNumber}</h2>
            <span className={`flex items-center gap-2 font-display text-sm md:text-base font-bold ${verdict.cls}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${verdict.bar}`} aria-hidden="true" />
              {verdict.text}
            </span>
          </div>
        </div>
        <ShareImageButton
          render={renderShareImage}
          fileName={`iron-maf-game-${game.gameNumber}.png`}
          title={`Игра #${game.gameNumber}`}
          showToast={showToast}
        />
      </header>

      {/* Notes */}
      {game.notes && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          {game.notes}
        </div>
      )}

      {/* Players table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full text-sm font-data">
            <thead>
              <tr className="border-b border-line text-stone-500">
                <th scope="col" className="sticky left-0 z-10 bg-elev-1 w-12 min-w-12 px-3 h-10 text-center font-medium">№</th>
                <th scope="col" className={`sticky left-12 z-10 bg-elev-1 px-3 h-10 text-left font-medium ${STICKY_EDGE}`}>Игрок</th>
                <th scope="col" className="px-3 h-10 text-left font-medium">Роль</th>
                <th scope="col" className="px-3 h-10 text-right font-medium" title="Итоговый балл">Итого</th>
                <th scope="col" className="px-3 h-10 text-right font-medium" title="Базовый балл">База</th>
                <th scope="col" className="px-3 h-10 text-right font-medium" title="Дополнительный балл">Доп.</th>
                <th scope="col" className="px-3 h-10 text-right font-medium" title="Рейтинг ELO после игры и его изменение">ELO</th>
                <th scope="col" className="px-3 h-10 text-left font-medium">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((gp) => {
                const player = players.find((p) => p.id === gp.playerId);
                const team = getTeam(gp.role);
                const won = gp.result === "win";
                // «Это я»: фон на всей строке, у закреплённых ячеек — непрозрачный
                const isMe = gp.playerId === meId;
                const stickyBg = isMe ? "bg-me" : "bg-elev-1";
                return (
                  <tr key={gp.seat} aria-current={isMe ? "true" : undefined}
                    className={`border-b border-line last:border-b-0 ${isMe ? "bg-me" : ""} ${won ? "" : "text-stone-400"}`}>
                    <td className={`sticky left-0 z-10 ${stickyBg} p-0 text-center ${isMe ? "shadow-[inset_3px_0_0_var(--color-accent-400)]" : ""}`}>
                      <span className="relative flex items-center justify-center h-14 font-semibold text-stone-300">
                        <span className={`absolute left-0 inset-y-2 w-[3px] rounded-r-full ${team === "red" ? "bg-red-500" : "bg-stone-500"} ${won ? "" : "opacity-40"}`} aria-hidden="true" />
                        {gp.seat}
                      </span>
                    </td>
                    <td className={`sticky left-12 z-10 ${stickyBg} px-3 ${STICKY_EDGE}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerAvatar player={player} size="xs" />
                        <button onClick={() => navigate("playerProfile", gp.playerId)}
                          className="font-sans font-medium text-stone-100 hover:text-accent-300 truncate max-w-[110px] sm:max-w-[200px] cursor-pointer">
                          {player?.nickname || "?"}
                        </button>
                        {isMe && <span className="shrink-0 text-[10px] font-sans font-semibold uppercase tracking-wider text-accent-300">вы</span>}
                        {game.firstKilled === gp.playerId && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 font-sans font-semibold" title="Первоубиенный">ПУ</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3">
                      <Badge variant={ROLE_BADGE_VARIANT[gp.role]}>{ROLE_NAMES[gp.role]}</Badge>
                    </td>
                    <td className={`px-3 text-right text-base font-semibold ${won ? "text-stone-50" : "text-stone-400"}`}>{fmt(gp.totalScore)}</td>
                    <td className="px-3 text-right">{gp.baseScore}</td>
                    <td className="px-3 text-right">
                      {gp.bonusScore !== 0 ? (
                        <span className={gp.bonusScore > 0 ? "text-emerald-400" : "text-red-400"}>
                          {gp.bonusScore > 0 ? "+" : ""}{fmt(gp.bonusScore)}
                        </span>
                      ) : <span className="text-stone-600">—</span>}
                    </td>
                    <td className="px-3 text-right whitespace-nowrap">
                      <EloCell game={game} gp={gp} />
                    </td>
                    <td className="px-3 font-sans text-stone-400 text-xs min-w-[140px]">{gp.bonusComment || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best move block */}
      {bestMoveDetails.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-medium text-stone-300 mb-2">
            Лучший ход{firstKilledPlayer ? ` — ${firstKilledPlayer.nickname}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {bestMoveDetails.map(({ seat, gp, player, isBlack }) => (
              <div
                key={seat}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm border ${
                  isBlack
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-stone-800/30 border-line-strong text-stone-400"
                }`}
              >
                <span className="font-semibold">{seat}</span>
                <span className="opacity-40">·</span>
                <span>{player?.nickname || "?"}</span>
                <Badge variant={ROLE_BADGE_VARIANT[gp?.role]}>{ROLE_NAMES[gp?.role]}</Badge>
                {isBlack ? (
                  <Check size={15} strokeWidth={3} className="text-emerald-400" aria-label="угадан" />
                ) : (
                  <X size={15} strokeWidth={3} className="text-stone-500" aria-label="не угадан" />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-500 mt-2">
            {bestMoveCorrectCount} из {bestMoveDetails.length}{bestMoveDetails.length === 1 ? " угадан" : " угаданы"}
          </p>
        </div>
      )}

      {/* Actions */}
      <AdminOnly>
        <div className="flex flex-wrap gap-2 pt-4 border-t border-line">
          <Button variant="secondary" icon={Pencil} onClick={() => navigate("gameForm", game.id)}>
            Редактировать игру
          </Button>
          <Button variant="danger-soft" icon={Trash2} onClick={() => setConfirmDelete(true)} className="ml-auto">
            Удалить
          </Button>
        </div>
      </AdminOnly>

      {confirmDelete && (
        <ConfirmDialog
          title="Удалить игру?"
          message={`Игра #${game.gameNumber} от ${formatDate(game.date)} будет удалена. Это действие нельзя отменить.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          confirmText="Удалить"
          danger
        />
      )}
    </div>
  );
}
