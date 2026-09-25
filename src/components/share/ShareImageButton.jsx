import { useCallback, useEffect, useState } from "react";
import { Download, Loader, Share2 } from "lucide-react";
import { Modal } from "../ui";
import { canShareFile, canvasToBlob, downloadFile, shareFile } from "../../lib/shareImage/share";

/**
 * Кнопка «Картинка»: рисует PNG через render(), показывает превью
 * и отдаёт файл через системное меню «Поделиться» или скачиванием.
 */
export function ShareImageButton({ render, fileName, title, showToast, className = "", label, icon: Icon = Share2 }) {
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
      const result = await shareFile(image.file);
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
        title={label ?? "Картинка для отправки"}
        aria-label={label ?? "Картинка для отправки"}
        className={`btn-ghost flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait ${label ? "px-3 py-2 text-sm" : "p-2"} ${className}`}
      >
        {busy ? <Loader size={16} className="animate-spin" /> : <Icon size={16} />}
        {label && <span>{label}</span>}
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
