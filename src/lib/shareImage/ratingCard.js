import {
  COLORS, HEIGHT, PAD, createCard, drawFooter, drawTable, drawText,
  font, formatNumber, loadPodiumAvatars,
} from './canvas';

const COLUMNS = [
  { key: 'place', label: '#', x: PAD, width: 56, align: 'center' },
  { key: 'nickname', label: 'Игрок', x: 136, width: 356 },
  { key: 'games', label: 'Игры', x: 500, width: 86, align: 'right', mono: true },
  { key: 'winrate', label: 'WR', x: 596, width: 90, align: 'right', mono: true },
  { key: 'avg', label: 'Ср. балл', x: 696, width: 108, align: 'right', mono: true },
  { key: 'bonus', label: 'Ср. доп.', x: 814, width: 108, align: 'right', mono: true },
  { key: 'elo', label: 'ELO', x: 930, width: 86, align: 'right', mono: true, color: () => COLORS.accentLight },
];

const MAX_ROWS = 15;
const ROW_HEIGHT = 56;
const PODIUM_HEIGHT = 104;
const HEADER_HEIGHT = 50;
const CONTENT_TOP = 356; // начало содержимого после шапки с подзаголовком (createCard)
const BOTTOM_SPACE = 170; // подпись о сортировке + подвал

// Топ-15 с подиумом не влезает в 4:5 — карточка вытягивается по содержимому
function cardHeight(rowCount) {
  const podiumRows = Math.min(rowCount, 3);
  const table = HEADER_HEIGHT + podiumRows * PODIUM_HEIGHT + (rowCount - podiumRows) * ROW_HEIGHT;
  return Math.max(HEIGHT, CONTENT_TOP + table + BOTTOM_SPACE);
}

/**
 * rows: строки в порядке страницы { nickname, avatarUrl, totalGames, winrate, avgScore, avgBonus, elo }.
 */
export async function renderRatingCard({ periodName, roleName, totalGames, minGames, sortLabel, rows }) {
  const topRows = rows.slice(0, MAX_ROWS);
  const subtitle = [
    `Сыграно игр: ${totalGames}`,
    minGames > 0 ? `в рейтинге от ${minGames}` : null,
  ].filter(Boolean).join(' · ');

  const [{ canvas, ctx, top }, avatars] = await Promise.all([
    createCard({
      kind: 'Рейтинг',
      title: [periodName, roleName].filter(Boolean).join(' · '),
      subtitle,
      height: cardHeight(topRows.length),
    }),
    loadPodiumAvatars(topRows),
  ]);

  const bottom = drawTable(ctx, {
    top,
    columns: COLUMNS,
    rows: topRows.map((r) => ({
      nickname: r.nickname,
      games: String(r.totalGames),
      winrate: `${Math.round(r.winrate ?? 0)}%`,
      avg: formatNumber(r.avgScore),
      bonus: formatNumber(r.avgBonus),
      elo: r.elo == null ? '—' : String(Math.round(r.elo)),
    })),
    rowHeight: ROW_HEIGHT,
    podiumHeight: PODIUM_HEIGHT,
    avatars,
  });

  if (sortLabel) {
    drawText(ctx, `Сортировка: ${sortLabel}`, PAD, bottom + 30, {
      font: font(400, 24),
      color: COLORS.textMuted,
    });
  }

  drawFooter(ctx);
  return canvas;
}
