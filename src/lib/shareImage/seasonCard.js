// Картинка «Итоги сезона»: цифры, пьедестал, номинации по ролям.
import { ROLE_COLORS } from '../constants';
import {
  WIDTH, PAD, COLORS, font, drawText, drawFittedText, drawAvatar, drawMedal,
  drawDivider, createCard, drawFooter, loadImage, formatNumber, formatSigned, pluralRu,
} from './canvas';

const GAMES = ['игра', 'игры', 'игр'];
const EVENINGS = ['вечер', 'вечера', 'вечеров'];
const PLAYERS = ['игрок', 'игрока', 'игроков'];

const percent = (v) => `${Math.round(v)}%`;

// Цветные части строки, по центру холста
function drawCenteredParts(ctx, y, parts, f) {
  ctx.font = f;
  const sep = '  ·  ';
  const sepWidth = ctx.measureText(sep).width;
  const width = parts.reduce((sum, [text], i) => sum + ctx.measureText(text).width + (i > 0 ? sepWidth : 0), 0);
  let x = (WIDTH - width) / 2;
  parts.forEach(([text, color], i) => {
    if (i > 0) {
      drawText(ctx, sep, x, y, { font: f, color: COLORS.textMuted });
      x += sepWidth;
    }
    drawText(ctx, text, x, y, { font: f, color });
    x += ctx.measureText(text).width;
  });
}

function drawStats(ctx, top, stats) {
  drawCenteredParts(ctx, top + 40, [
    [`${stats.games} ${pluralRu(stats.games, GAMES)}`, COLORS.text],
    [`${stats.evenings} ${pluralRu(stats.evenings, EVENINGS)}`, COLORS.text],
    [`${stats.players} ${pluralRu(stats.players, PLAYERS)}`, COLORS.text],
  ], font(600, 40));

  const wins = [
    [`Красные ${stats.redWins} (${percent(stats.redWinrate)})`, COLORS.red],
    [`Чёрные ${stats.blackWins} (${percent(stats.blackWinrate)})`, COLORS.black],
  ];
  if (stats.draws > 0) wins.push([`Ничьи ${stats.draws}`, COLORS.accentLight]);
  drawCenteredParts(ctx, top + 96, wins, font(500, 30));
  return top + 136;
}

// Место на пьедестале: аватар с медалью, ник, две строки цифр
function drawPlace(ctx, entry, place, cx, top, size, image) {
  drawAvatar(ctx, { image, nickname: entry.nickname, x: cx - size / 2, y: top, size, ring: COLORS.medals[place - 1] });
  const r = Math.round(size * 0.17);
  drawMedal(ctx, place, cx + size / 2 - r * 0.6, top + size - r * 0.6, r);

  const colWidth = place === 1 ? 360 : 290;
  const nickY = top + size + 32;
  drawFittedText(ctx, entry.nickname, cx, nickY, {
    weight: 700, size: place === 1 ? 38 : 32, maxWidth: colWidth, align: 'center',
  });
  drawText(ctx, `ср. ${formatNumber(entry.avgScore)} · доп. ${formatSigned(entry.avgBonus)}`, cx, nickY + 38, {
    font: font(500, 23, true), color: COLORS.textSecondary, align: 'center', maxWidth: colWidth,
  });
  drawText(ctx, `${entry.totalGames} ${pluralRu(entry.totalGames, GAMES)} · ${percent(entry.winrate)}`, cx, nickY + 70, {
    font: font(500, 23, true), color: COLORS.textMuted, align: 'center', maxWidth: colWidth,
  });
}

async function drawPodium(ctx, top, podium, threshold) {
  drawText(ctx, 'ПЬЕДЕСТАЛ', WIDTH / 2, top + 32, { font: font(600, 24), color: COLORS.accentLight, align: 'center' });
  const bodyTop = top + 64;

  if (podium.length === 0) {
    drawText(ctx, `Порог сезона (${threshold} ${pluralRu(threshold, GAMES)}) никто не набрал`, WIDTH / 2, bodyTop + 120, {
      font: font(500, 32), color: COLORS.textSecondary, align: 'center', maxWidth: WIDTH - PAD * 2,
    });
    return bodyTop + 260;
  }

  const images = await Promise.all(podium.map((p) => loadImage(p.avatarUrl)));
  // 1-е место по центру и выше, 2-е слева, 3-е справа
  const layout = [
    { cx: WIDTH / 2, top: bodyTop, size: 150 },
    { cx: PAD + 150, top: bodyTop + 40, size: 116 },
    { cx: WIDTH - PAD - 150, top: bodyTop + 40, size: 116 },
  ];
  podium.forEach((entry, i) => drawPlace(ctx, entry, i + 1, layout[i].cx, layout[i].top, layout[i].size, images[i]));
  return bodyTop + 40 + 116 + 32 + 70 + 36;
}

async function drawNominations(ctx, top, nominations) {
  const rowHeight = 84;
  const images = await Promise.all(nominations.map((n) => loadImage(n.leader?.avatarUrl)));

  nominations.forEach(({ role, label, leader }, i) => {
    const cy = top + 20 + rowHeight * i + rowHeight / 2;
    ctx.fillStyle = ROLE_COLORS[role];
    ctx.fillRect(PAD, cy - 26, 8, 52);
    drawText(ctx, label, PAD + 28, cy, { font: font(600, 30), maxWidth: 300 });

    if (!leader) {
      drawText(ctx, '—', 430, cy, { font: font(600, 30), color: COLORS.textMuted });
      return;
    }
    drawAvatar(ctx, { image: images[i], nickname: leader.nickname, x: 400, y: cy - 30, size: 60 });
    drawFittedText(ctx, leader.nickname, 480, cy, { weight: 600, size: 30, maxWidth: 290 });
    drawText(ctx, `${formatSigned(leader.avgBonus)} · ${leader.games} ${pluralRu(leader.games, GAMES)}`, WIDTH - PAD, cy, {
      font: font(500, 26, true), color: COLORS.textSecondary, align: 'right',
    });
  });
}

/** summary — результат buildSeasonSummary. */
export async function renderSeasonCard(summary) {
  const { canvas, ctx, top } = await createCard({
    kind: 'Итоги сезона',
    title: summary.seasonName,
    subtitle: summary.period,
  });

  let y = drawStats(ctx, top, summary.stats);
  drawDivider(ctx, y);
  y = await drawPodium(ctx, y, summary.podium, summary.threshold);
  drawDivider(ctx, y);
  await drawNominations(ctx, y, summary.nominations);
  drawFooter(ctx);
  return canvas;
}
