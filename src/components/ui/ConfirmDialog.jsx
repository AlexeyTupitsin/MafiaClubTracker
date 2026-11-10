import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Field";

// Подтверждение действия. Если onConfirm возвращает промис, кнопка показывает
// спиннер до его завершения — второе нажатие не отправит запрос повторно.
export function ConfirmDialog({
  title, message, onConfirm, onCancel,
  confirmText = "Подтвердить", cancelText = "Отмена", danger = false,
}) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onCancel} footer={
      <>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>{cancelText}</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={confirm} loading={busy}>
          {confirmText}
        </Button>
      </>
    }>
      <p className="text-sm leading-relaxed text-stone-300">{message}</p>
    </Modal>
  );
}
