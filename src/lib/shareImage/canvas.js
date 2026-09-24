// Общие примитивы для картинок, которыми делятся в чате клуба.
// Всё рисуется на Canvas 2D; координаты — в пикселях итогового PNG.
import { CLUB_NAME, CLUB_CITY } from '../clubConfig';

export const WIDTH = 1080;
export const HEIGHT = 1350;
export const PAD = 64;

export const COLORS = {
  bg: '#0a0908',
  accent: '#6366f1',
  accentLight: '#818cf8',
  text: '#faf8f5',
  textSecondary: '#a8a3a0',
  textMuted: '#5c5855',
  border: 'rgba(99, 102, 241, 0.14)',
  red: '#ef4444',
  black: '#9ca3af',
  green: '#10b981',
  danger: '#ef4444',
  medals: ['#f5c542', '#c0c7d1', '#cd7f32'],
};

const FONT_TIMEOUT_MS = 3000;

export function font(weight, size, mono = false) {
  const family = mono
    ? "'JetBrains Mono', ui-monospace, monospace"
    : "Inter, system-ui, -apple-system, sans-serif";
  return `${weight} ${size}px ${family}`;
}

export function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// Шрифты подключены через Google Fonts, но Canvas не ждёт их сам:
// без явной загрузки первая картинка нарисуется системным шрифтом.
export async function loadFonts() {
  if (!document.fonts?.load) return;
  const loads = [
    font(400, 16), font(600, 16), font(700, 16),
    font(500, 16, true), font(700, 16, true),
  ].map((f) => document.fonts.load(f, 'Аа1'));
  const timeout = new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS));
  await Promise.race([Promise.all(loads), timeout]).catch(() => {});
}

// null при ошибке или таймауте — вызывающий рисует заглушку.
// crossOrigin обязателен: иначе чужая картинка «загрязнит» холст и toBlob упадёт.
export function loadImage(url, timeoutMs = 3000) {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = img.onerror = null;
      resolve(null);
    }, timeoutMs);
    img.crossOrigin = 'anonymous';
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });
}

export function fitText(ctx, text, maxWidth) {
  const str = String(text ?? '');
  if (!maxWidth || ctx.measureText(str).width <= maxWidth) return str;
  let lo = 0;
  let hi = str.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(str.slice(0, mid) + '…').width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return str.slice(0, lo).trimEnd() + '…';
}

export function drawText(ctx, text, x, y, { font: f, color = COLORS.text, align = 'left', maxWidth } = {}) {
  if (f) ctx.font = f;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(fitText(ctx, text, maxWidth), x, y);
}

/**
 * Текст, который уменьшается до minSize, чтобы влезть в maxWidth,
 * и только потом обрезается с «…». Для ников и заголовков.
 */
export function drawFittedText(ctx, text, x, y, { weight, size, minSize = Math.round(size * 0.65), maxWidth, color, align }) {
  let current = size;
  ctx.font = font(weight, current);
  while (current > minSize && ctx.measureText(String(text ?? '')).width > maxWidth) {
    current -= 1;
    ctx.font = font(weight, current);
  }
  drawText(ctx, text, x, y, { color, align, maxWidth });
}

function drawImageCover(ctx, image, x, y, size) {
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.drawImage(image, x + (size - w) / 2, y + (size - h) / 2, w, h);
}

export function drawAvatar(ctx, { image, nickname, x, y, size, ring }) {
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (image) {
    drawImageCover(ctx, image, x, y, size);
  } else {
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, '#4f46e5');
    g.addColorStop(1, '#312e81');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, size, size);
    drawText(ctx, (nickname || '?').slice(0, 1).toUpperCase(), cx, cy + 2, {
      font: font(700, Math.round(size * 0.42)),
      align: 'center',
    });
  }
  ctx.restore();

  if (ring) {
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2.5, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = ring;
    ctx.stroke();
  }
}

export function drawMedal(ctx, place, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.medals[place - 1];
  ctx.fill();
  drawText(ctx, String(place), cx, cy + 1, {
    font: font(700, Math.round(r * 1.1)),
    color: COLORS.bg,
    align: 'center',
  });
}

function drawBackground(ctx) {
  const height = ctx.canvas.height;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, WIDTH, height);

  const glow = ctx.createRadialGradient(WIDTH * 0.85, -100, 0, WIDTH * 0.85, -100, 900);
  glow.addColorStop(0, 'rgba(99, 102, 241, 0.28)');
  glow.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, height);

  const glow2 = ctx.createRadialGradient(0, height + 100, 0, 0, height + 100, 700);
  glow2.addColorStop(0, 'rgba(79, 70, 229, 0.16)');
  glow2.addColorStop(1, 'rgba(79, 70, 229, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, WIDTH, height);
}

export function drawDivider(ctx, y) {
  ctx.fillStyle = COLORS.border;
  ctx.fillRect(PAD, y, WIDTH - PAD * 2, 2);
}

/**
 * Холст с фоном, шапкой клуба и заголовком карточки.
 * Возвращает y, с которого начинается содержимое.
 */
export async function createCard({ kind, title, subtitle, height = HEIGHT }) {
  const [, logo] = await Promise.all([
    loadFonts(),
    loadImage(`${import.meta.env.BASE_URL}logo.jpg`),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  drawBackground(ctx);

  const headerY = 104;
  let nameX = PAD;
  if (logo) {
    drawAvatar(ctx, { image: logo, x: PAD, y: headerY - 48, size: 96 });
    nameX = PAD + 120;
  }
  const kindText = kind.toUpperCase();
  ctx.font = font(600, 26);
  const kindWidth = ctx.measureText(kindText).width;
  drawText(ctx, kindText, WIDTH - PAD, headerY, { color: COLORS.accentLight, align: 'right' });
  drawText(ctx, CLUB_NAME, nameX, headerY, {
    font: font(700, 40),
    maxWidth: WIDTH - PAD - kindWidth - 32 - nameX,
  });

  drawDivider(ctx, 184);

  drawFittedText(ctx, title, PAD, 248, { weight: 700, size: 58, minSize: 40, maxWidth: WIDTH - PAD * 2 });
  let top = 296;
  if (subtitle) {
    drawText(ctx, subtitle, PAD, 312, {
      font: font(400, 30),
      color: COLORS.textSecondary,
      maxWidth: WIDTH - PAD * 2,
    });
    top = 356;
  }

  return { canvas, ctx, top };
}

export const FOOTER_HEIGHT = 120;

export function drawFooter(ctx) {
  const y = ctx.canvas.height - 72;
  drawDivider(ctx, y - 38);
  const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  drawText(ctx, [CLUB_CITY, date].filter(Boolean).join(' · '), PAD, y, {
    font: font(400, 26),
    color: COLORS.textMuted,
  });
  drawText(ctx, CLUB_NAME, WIDTH - PAD, y, {
    font: font(600, 26),
    color: COLORS.textMuted,
    align: 'right',
  });
}

function cellX(col) {
  if (col.align === 'right') return col.x + col.width;
  if (col.align === 'center') return col.x + col.width / 2;
  return col.x;
}

const PODIUM_AVATAR = 88;

/**
 * Таблица. columns: [{ key, label, x, width, align, mono, color?(row) }];
 * колонки 'place' и 'nickname' обязательны. rows — значения уже строками.
 * avatars (массив до 3 элементов Image|null) включает «подиум» для первых трёх строк.
 * Возвращает y нижней границы таблицы.
 */
export function drawTable(ctx, { top, columns, rows, rowHeight = 62, podiumHeight = 112, avatars }) {
  const headerHeight = 44;
  for (const col of columns) {
    drawText(ctx, col.label.toUpperCase(), cellX(col), top + headerHeight / 2, {
      font: font(600, 22),
      color: COLORS.textMuted,
      align: col.align || 'left',
    });
  }

  let y = top + headerHeight + 6;
  rows.forEach((row, i) => {
    const podium = Boolean(avatars) && i < 3;
    const h = podium ? podiumHeight : rowHeight;
    const cy = y + h / 2;
    const medal = COLORS.medals[i];

    if (podium) {
      ctx.fillStyle = withAlpha(medal, 0.1);
      ctx.beginPath();
      ctx.roundRect(PAD - 16, y + 4, WIDTH - PAD * 2 + 32, h - 8, 18);
      ctx.fill();
      ctx.fillStyle = medal;
      ctx.beginPath();
      ctx.roundRect(PAD - 16, y + 4, 8, h - 8, [18, 0, 0, 18]);
      ctx.fill();
    } else if (i > 0) {
      ctx.fillStyle = 'rgba(99, 102, 241, 0.07)';
      ctx.fillRect(PAD, y, WIDTH - PAD * 2, 1);
    }

    for (const col of columns) {
      if (col.key === 'place') {
        if (podium) {
          drawMedal(ctx, i + 1, col.x + col.width / 2, cy, 24);
        } else {
          drawText(ctx, row.place ?? String(i + 1), cellX(col), cy, {
            font: font(600, 28, true),
            color: COLORS.textSecondary,
            align: col.align || 'center',
          });
        }
        continue;
      }

      if (col.key === 'nickname') {
        let x = col.x;
        let width = col.width;
        if (podium) {
          drawAvatar(ctx, {
            image: avatars[i],
            nickname: row.nickname,
            x,
            y: cy - PODIUM_AVATAR / 2,
            size: PODIUM_AVATAR,
            ring: medal,
          });
          x += PODIUM_AVATAR + 20;
          width -= PODIUM_AVATAR + 20;
        }
        drawFittedText(ctx, row.nickname, x, cy, {
          weight: podium ? 700 : 600,
          size: podium ? 38 : 32,
          minSize: podium ? 24 : 22,
          color: col.color?.(row) ?? COLORS.text,
          maxWidth: width,
        });
        continue;
      }

      drawText(ctx, row[col.key] ?? '', cellX(col), cy, {
        font: col.mono
          ? font(podium ? 700 : 500, podium ? 32 : 30, true)
          : font(podium ? 700 : 600, podium ? 32 : 28),
        color: col.color?.(row) ?? COLORS.text,
        align: col.align || 'left',
        maxWidth: col.width,
      });
    }

    y += h;
  });

  return y;
}

// Баллы всегда с двумя знаками: 1.5 → «1.50»; отрицательные — с настоящим минусом
export function formatNumber(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return '—';
  const n = Number(value);
  const text = Math.abs(n).toFixed(digits);
  return n < 0 && Number(text) !== 0 ? `−${text}` : text;
}

// Аватары для «подиума» — первые три строки таблицы
export function loadPodiumAvatars(rows) {
  return Promise.all(rows.slice(0, 3).map((row) => loadImage(row.avatarUrl)));
}

// +12 / −8 (настоящий минус); null → «—»
export function formatDelta(value) {
  if (value == null) return '—';
  const n = Math.round(value);
  if (n === 0) return '0';
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

// Склонение после числа: pluralRu(5, ['игра', 'игры', 'игр']) → «игр»
export function pluralRu(n, [one, few, many]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

// Со знаком: «+0.41» / «−0.12» / «0.00». Знак по округлённому значению — 0.004 не «+0.00»
export function formatSigned(value, digits = 2) {
  const text = formatNumber(value, digits);
  return Number(Number(value).toFixed(digits)) > 0 ? `+${text}` : text;
}
