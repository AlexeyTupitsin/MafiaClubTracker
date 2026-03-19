import { Modal } from "./Modal";

export function ConfirmDialog({
  title, message, onConfirm, onCancel,
  confirmText = "Подтвердить", cancelText = "Отмена", danger = false,
}) {
  return (
    <Modal title={title} onClose={onCancel} footer={
      <>
        <button onClick={onCancel}
          className="px-4 py-2 border border-zinc-700 rounded-lg hover:bg-zinc-800 text-zinc-300 text-sm">
          {cancelText}
        </button>
        <button onClick={onConfirm}
          className={`px-4 py-2 rounded-lg text-white text-sm ${
            danger ? "bg-red-600 hover:bg-red-700" : "bg-violet-600 hover:bg-violet-500"
          }`}>
          {confirmText}
        </button>
      </>
    }>
      <p className="text-zinc-400">{message}</p>
    </Modal>
  );
}
