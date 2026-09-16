import { useCallback, useEffect, useState } from "react";
import { Download, Loader, Share2 } from "lucide-react";
import { Modal } from "../ui";
import { canShareFile, canvasToBlob, downloadFile, shareFile } from "../../lib/shareImage/share";

/**
 * Кнопка «Картинка»: рисует PNG через render(), показывает превью
 * и отдаёт файл через системное меню «Поделиться» или скачиванием.
 */
export function ShareImageButton({ render, fileName, title, showToast, className = "" }) {
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState(null); // { file, url }

  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.url);
  }, [image]);

  const fail = (err) => {
    console.error("Share image failed:", err);
    showToast?.("Не удалось создать картинку", "error");
  };

  const handleOpen = async () => {
    setBusy(true);
    try {
      const canvas = await render();
      const blob = await canvasToBlob(canvas);
      const file = new File([blob], fileName, { type: "image/png" });
      setImage({ file, url: URL.createObjectURL(blob) });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const close = useCallback(() => setImage(null), []);

  const handleShare = async () => {
    try {
      const result = await shareFile(image.file, title);
      if (result === "shared") close();
    } catch (err) {
      fail(err);
    }
  };

  const canShare = image ? canShareFile(image.file) : false;

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={busy}
        title="Картинка для отправки"
        aria-label="Картинка для отправки"
        className={`btn-ghost flex items-center gap-1.5 px-3 py-2 text-sm cursor-pointer disabled:opacity-60 disabled:cursor-wait ${className}`}
      >
        {busy ? <Loader size={16} className="animate-spin" /> : <Share2 size={16} />}
        <span className="hidden sm:inline">Картинка</span>
      </button>

      {image && (
        <Modal
          title={title}
          onClose={close}
          footer={
            <>
              <button onClick={() => downloadFile(image.file, fileName)}
                className="btn-ghost flex items-center gap-1.5 px-4 py-2 text-sm cursor-pointer">
                <Download size={14} /> Скачать
              </button>
              {canShare && (
                <button onClick={handleShare}
                  className="btn-gradient flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium cursor-pointer transition-all">
                  <Share2 size={14} /> Поделиться
                </button>
              )}
            </>
          }
        >
          <img src={image.url} alt={title} className="w-full rounded-lg border border-indigo-500/10" />
        </Modal>
      )}
    </>
  );
}
