import { ROLE_NAMES, ROLE_COLORS } from '../constants';
import {
  COLORS, PAD, WIDTH, createCard, drawFooter, drawTable, drawText,
  font, formatNumber, loadPodiumAvatars,
} from './canvas';

const COLUMNS = [
  { key: 'place', label: '#', x: PAD, width: 56, align: 'center' },
  { key: 'nickname', label: 'Игрок', x: 136, width: 470 },
  { key: 'games', label: 'Игры', x: 620, width: 110, align: 'right', mono: true },
  { key: 'wins', label: 'Победы', x: 750, width: 130, align: 'right', mono: true },
  { key: 'avg', label: 'Ср. балл', x: 896, width: 120, align: 'right', mono: true },
];

const TILE_HEIGHT = 76;

function pluralGames(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'игра';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'игры';
  return 'игр';
}

// «8 игр · Красные 5 · Чёрные 3» — счёт командами разными цветами
function drawScoreLine(ctx, y, { totalGames, redWins, blackWins, draws }) {
  const parts = [
    [`${totalGames} ${pluralGames(totalGames)}`, COLORS.text],
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

// Плитки прижаты к подвалу: высота таблицы зависит от числа игроков
function drawRoleTiles(ctx, bestByRole) {
  if (bestByRole.length === 0) return;
  const gap = 16;
  const tileWidth = (WIDTH - PAD * 2 - gap * 3) / 4;
  const tilesTop = ctx.canvas.height - 124 - TILE_HEIGHT;

  drawText(ctx, 'ЛУЧШИЕ ПО РОЛЯМ', PAD, tilesTop - 22, { font: font(600, 22), color: COLORS.textMuted });
  bestByRole.forEach(({ role, nickname }, i) => {
    const x = PAD + i * (tileWidth + gap);
    ctx.fillStyle = 'rgba(99, 102, 241, 0.07)';
    ctx.beginPath();
    ctx.roundRect(x, tilesTop, tileWidth, TILE_HEIGHT, 14);
    ctx.fill();
    drawText(ctx, ROLE_NAMES[role], x + 18, tilesTop + 24, {
      font: font(600, 22),
      color: ROLE_COLORS[role],
    });
    drawText(ctx, nickname, x + 18, tilesTop + 53, {
      font: font(700, 28),
      maxWidth: tileWidth - 36,
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
    createCard({ kind: 'Итоги вечера', title: name, subtitle: date }),
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
