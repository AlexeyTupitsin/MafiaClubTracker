import { NOMINATION_CONFIG, ROLE_COLORS } from '../constants';
import {
  COLORS, PAD, WIDTH, createCard, drawFittedText, drawFooter, drawTable, drawText,
  font, formatNumber, loadPodiumAvatars, pluralRu,
} from './canvas';

const COLUMNS = [
  { key: 'place', label: '#', x: PAD, width: 56, align: 'center' },
  { key: 'nickname', label: 'Игрок', x: 136, width: 470 },
  { key: 'games', label: 'Игры', x: 620, width: 110, align: 'right', mono: true },
  { key: 'wins', label: 'Победы', x: 750, width: 130, align: 'right', mono: true },
  { key: 'avg', label: 'Ср. балл', x: 896, width: 120, align: 'right', mono: true },
];

const NOMINATION_LABELS = Object.fromEntries(NOMINATION_CONFIG.map((n) => [n.role, n.label]));

const TILE_HEIGHT = 50;
const TILE_GAP = 10;

// «8 игр · Красные 5 · Чёрные 3» — счёт командами разными цветами
function drawScoreLine(ctx, y, { totalGames, redWins, blackWins, draws }) {
  const parts = [
    [`${totalGames} ${pluralRu(totalGames, ['игра', 'игры', 'игр'])}`, COLORS.text],
    [`Красные ${redWins}`, COLORS.red],
    [`Чёрные ${blackWins}`, COLORS.black],
  ];
  if (draws > 0) parts.push([`Ничьи ${draws}`, COLORS.accentLight]);

  ctx.font = font(600, 30);
  const sep = '  ·  ';
  let x = PAD;
  parts.forEach(([text, color], i) => {
    if (i > 0) {
      drawText(ctx, sep, x, y, { color: COLORS.textMuted });
      x += ctx.measureText(sep).width;
    }
    drawText(ctx, text, x, y, { color });
    x += ctx.measureText(text).width;
  });
}

// Плитки 2×2 прижаты к подвалу: высота таблицы зависит от числа игроков
function drawRoleTiles(ctx, bestByRole) {
  if (bestByRole.length === 0) return;
  const tileWidth = (WIDTH - PAD * 2 - TILE_GAP) / 2;
  const blockTop = ctx.canvas.height - 124 - (TILE_HEIGHT * 2 + TILE_GAP);

  bestByRole.forEach(({ role, nickname }, i) => {
    const x = PAD + (i % 2) * (tileWidth + TILE_GAP);
    const y = blockTop + Math.floor(i / 2) * (TILE_HEIGHT + TILE_GAP);
    const cy = y + TILE_HEIGHT / 2;
    ctx.fillStyle = 'rgba(99, 102, 241, 0.07)';
    ctx.beginPath();
    ctx.roundRect(x, y, tileWidth, TILE_HEIGHT, 12);
    ctx.fill();

    const label = NOMINATION_LABELS[role];
    ctx.font = font(600, 22);
    const labelWidth = ctx.measureText(label).width;
    drawText(ctx, label, x + 18, cy, { color: ROLE_COLORS[role] });
    drawFittedText(ctx, nickname, x + tileWidth - 18, cy, {
      weight: 700,
      size: 28,
      minSize: 18,
      align: 'right',
      maxWidth: tileWidth - labelWidth - 54,
    });
  });
}

/**
 * rows: до 10 строк { nickname, avatarUrl, totalGames, wins, avgScore } в порядке страницы.
 * bestByRole: [{ role, nickname }].
 */
export async function renderTournamentCard({
  name, date, totalGames, redWins, blackWins, draws, rows, bestByRole,
}) {
  const topRows = rows.slice(0, 10);
  const [{ canvas, ctx, top }, avatars] = await Promise.all([
    createCard({ kind: 'Итоги турнира', title: name, subtitle: date }),
    loadPodiumAvatars(topRows),
  ]);

  drawScoreLine(ctx, top + 8, { totalGames, redWins, blackWins, draws });

  drawTable(ctx, {
    top: top + 44,
    columns: COLUMNS,
    rows: topRows.map((r) => ({
      nickname: r.nickname,
      games: String(r.totalGames),
      wins: String(r.wins),
      avg: formatNumber(r.avgScore),
    })),
    rowHeight: 48,
    podiumHeight: 104,
    avatars,
  });

  drawRoleTiles(ctx, bestByRole);
  drawFooter(ctx);
  return canvas;
}
