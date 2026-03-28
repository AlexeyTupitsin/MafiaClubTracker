import { Modal } from "./Modal";

export function ConfirmDialog({
  title, message, onConfirm, onCancel,
  confirmText = "Подтвердить", cancelText = "Отмена", danger = false,
}) {
  return (
    <Modal title={title} onClose={onCancel} footer={
      <>
        <button onClick={onCancel}
          className="btn-ghost px-4 py-2 text-sm cursor-pointer">
          {cancelText}
        </button>
        <button onClick={onConfirm}
          className={`px-4 py-2 rounded-xl text-white text-sm font-medium cursor-pointer transition-all ${
            danger ? "bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/20" : "btn-gradient"
          }`}>
          {confirmText}
        </button>
      </>
    }>
      <p className="text-slate-400">{message}</p>
    </Modal>
  );
}
