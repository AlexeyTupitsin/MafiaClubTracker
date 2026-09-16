// Отдача готовой картинки: системное меню «Поделиться» или скачивание.

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Не удалось получить PNG из холста'));
    }, 'image/png');
  });
}

export function canShareFile(file) {
  try {
    return Boolean(navigator.canShare?.({ files: [file] }));
  } catch {
    return false;
  }
}

export async function shareFile(file, title) {
  try {
    await navigator.share({ files: [file], title });
    return 'shared';
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled';
    throw err;
  }
}

export function downloadFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari начинает скачивание асинхронно — не отзываем ссылку сразу
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
