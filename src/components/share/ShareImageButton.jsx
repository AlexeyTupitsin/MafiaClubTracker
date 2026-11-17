import { useCallback, useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button, Modal } from "../ui";
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
      const result = await shareFile(image.file);
      if (result === "shared") close();
    } catch (err) {
      fail(err);
    }
  };

  const canShare = image ? canShareFile(image.file) : false;

  return (
    <>
      <Button
        variant="secondary"
        size="icon"
        icon={Share2}
        loading={busy}
        onClick={handleOpen}
        title="Картинка для отправки"
        aria-label="Картинка для отправки"
        className={className}
      />

      {image && (
        <Modal
          title={title}
          onClose={close}
          footer={
            <>
              <Button variant={canShare ? "secondary" : "primary"} icon={Download}
                onClick={() => downloadFile(image.file, fileName)}>
                Скачать картинку
              </Button>
              {canShare && (
                <Button icon={Share2} onClick={handleShare}>Поделиться</Button>
              )}
            </>
          }
        >
          <img src={image.url} alt={title} className="w-full rounded-lg border border-line" />
        </Modal>
      )}
    </>
  );
}
