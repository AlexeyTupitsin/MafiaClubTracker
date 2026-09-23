import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "./ui";

// Ошибка загрузки файла страницы: после деплоя старые чанки удалены.
// Обычно такую ошибку перехватывает vite:preloadError в main.jsx и
// перезагружает страницу — сюда она доходит, если перезагрузка не помогла.
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

/**
 * Ошибка при отрисовке страницы не роняет всё приложение в белый экран:
 * меню остаётся, вместо страницы — сообщение и кнопка «Обновить».
 * Сбрасывается сменой key (App передаёт текущую страницу).
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page render failed:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isChunkError = CHUNK_ERROR.test(error?.message ?? "");
    return (
      <EmptyState
        icon={AlertTriangle}
        title={isChunkError ? "Вышла новая версия приложения" : "Не удалось показать страницу"}
        description={isChunkError
          ? "Обновите страницу, чтобы загрузить её."
          : "Произошла ошибка. Попробуйте обновить страницу — если не поможет, сообщите администратору."}
        action={
          <button onClick={() => window.location.reload()}
            className="btn-ghost px-4 py-2 text-sm cursor-pointer">
            Обновить
          </button>
        }
      />
    );
  }
}
