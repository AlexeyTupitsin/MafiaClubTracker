import { ROLE_NAMES, ROLE_COLORS } from '../constants';
import {
  COLORS, PAD, WIDTH, createCard, drawFooter, drawTable, drawText,
  font, formatDelta, formatNumber, withAlpha,
} from './canvas';

const WINNER = {
  red: { label: 'Победа красных', color: COLORS.red },
  black: { label: 'Победа чёрных', color: COLORS.black },
  draw: { label: 'Ничья', color: COLORS.accentLight },
};

function columns(hasElo) {
  const role = { key: 'role', label: 'Роль', color: (r) => ROLE_COLORS[r.roleKey] };
  const bonus = { key: 'bonus', label: 'Доп.', align: 'right', mono: true, color: (r) => r.bonusColor };
  if (hasElo) {
    return [
      { key: 'place', label: '№', x: PAD, width: 56, align: 'center' },
      { key: 'nickname', label: 'Игрок', x: 136, width: 340 },
      { ...role, x: 492, width: 150 },
      { key: 'total', label: 'Баллы', x: 652, width: 110, align: 'right', mono: true },
      { ...bonus, x: 782, width: 110 },
      { key: 'elo', label: 'ELO', x: 902, width: 114, align: 'right', mono: true, color: (r) => r.eloColor },
    ];
  }
  return [
    { key: 'place', label: '№', x: PAD, width: 56, align: 'center' },
    { key: 'nickname', label: 'Игрок', x: 136, width: 400 },
    { ...role, x: 552, width: 160 },
    { key: 'total', label: 'Баллы', x: 722, width: 130, align: 'right', mono: true },
    { ...bonus, x: 866, width: 150 },
  ];
}

function signColor(value) {
  if (!value) return COLORS.textMuted;
  return value > 0 ? COLORS.green : COLORS.danger;
}

function formatBonus(value) {
  if (!value) return '—';
  return `${value > 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`;
}

/**
 * rows: [{ seat, nickname, role, bonusScore, totalScore, eloDelta }], по местам.
 */
export async function renderGameCard({
  gameNumber, date, tournamentName, winner, rows, firstKilledNickname, bestMoveSeats = [], hasElo,
}) {
  const { canvas, ctx, top } = await createCard({
    kind: 'Итоги игры',
    title: `Игра №${gameNumber}`,
    subtitle: [date, tournamentName].filter(Boolean).join(' · '),
  });

  const w = WINNER[winner] ?? WINNER.draw;
  const plateTop = top + 16;
  ctx.fillStyle = withAlpha(w.color, 0.15);
  ctx.beginPath();
  ctx.roundRect(PAD, plateTop, WIDTH - PAD * 2, 76, 18);
  ctx.fill();
  drawText(ctx, w.label, WIDTH / 2, plateTop + 39, { font: font(700, 40), color: w.color, align: 'center' });

  const tableRows = rows.map((r) => {
    const eloDelta = r.eloDelta == null ? null : Math.round(r.eloDelta);
    return {
      place: String(r.seat),
      nickname: r.nickname,
      roleKey: r.role,
      role: ROLE_NAMES[r.role] ?? r.role,
      total: formatNumber(r.totalScore),
      bonus: formatBonus(r.bonusScore),
      bonusColor: signColor(r.bonusScore),
      elo: formatDelta(eloDelta),
      eloColor: signColor(eloDelta),
    };
  });

  let y = drawTable(ctx, { top: plateTop + 96, columns: columns(hasElo), rows: tableRows });

  const extras = [];
  if (firstKilledNickname) extras.push(['Первый убиенный', firstKilledNickname]);
  if (bestMoveSeats.length > 0) extras.push(['Лучший ход', bestMoveSeats.join(', ')]);
  y += 12;
  for (const [label, value] of extras) {
    y += 36;
    ctx.font = font(400, 28);
    const labelText = `${label}: `;
    const labelWidth = ctx.measureText(labelText).width;
    drawText(ctx, labelText, PAD, y, { color: COLORS.textSecondary });
    drawText(ctx, value, PAD + labelWidth, y, {
      font: font(600, 28),
      maxWidth: WIDTH - PAD * 2 - labelWidth,
    });
  }

  drawFooter(ctx);
  return canvas;
}
