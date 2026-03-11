import { Modal } from "./Modal";

export function ConfirmDialog({
  title, message, onConfirm, onCancel,
  confirmText = "Подтвердить", cancelText = "Отмена", danger = false,
}) {
  return (
    <Modal title={title} onClose={onCancel} footer={
      <>
        <button onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
          {cancelText}
        </button>
        <button onClick={onConfirm}
          className={`px-4 py-2 rounded-lg text-white text-sm ${
            danger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
          }`}>
          {confirmText}
        </button>
      </>
    }>
      <p className="text-gray-600">{message}</p>
    </Modal>
  );
}
