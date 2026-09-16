import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

const GAP = 6;
const MARGIN = 8;

// Всплывающая подсказка с произвольным содержимым.
// Нативный title= не годится для многострочных формул, поэтому свой поповер:
// на десктопе — по наведению, на тач-устройствах — по нажатию.
// Рендерится в body с fixed-позицией, чтобы не обрезаться контейнерами с overflow;
// открывается над элементом, а если сверху не хватает места — под ним.
export function Tooltip({ children, content, align = "right" }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const anchorRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (!anchorRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const close = () => setOpen(false);

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const anchor = anchorRef.current.getBoundingClientRect();
    const { width, height } = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;

    const fitsAbove = anchor.top - GAP - height >= MARGIN;
    const fitsBelow = anchor.bottom + GAP + height <= viewportHeight - MARGIN;
    const top = fitsAbove || !fitsBelow ? anchor.top - GAP - height : anchor.bottom + GAP;

    const preferredLeft = align === "right" ? anchor.right - width : anchor.left;
    const left = Math.min(Math.max(preferredLeft, MARGIN), viewportWidth - width - MARGIN);

    setPosition({ top: Math.max(top, MARGIN), left });
  }, [open, align]);

  if (!content) return children;

  return (
    <span
      ref={anchorRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-help text-left"
      >
        {children}
      </button>

      {open && createPortal(
        <span
          ref={tooltipRef}
          role="tooltip"
          style={{
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            visibility: position ? "visible" : "hidden",
          }}
          className="fixed z-50 w-max max-w-[min(26rem,calc(100vw-1rem))] pointer-events-none
            rounded-lg border border-indigo-500/20 bg-slate-900/95 px-3 py-2
            text-xs font-normal text-slate-300 shadow-xl backdrop-blur-sm"
        >
          {content}
        </span>,
        document.body
      )}
    </span>
  );
}
