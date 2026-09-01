import { useState, useRef, useEffect } from "react";

// Всплывающая подсказка с произвольным содержимым.
// Нативный title= не годится для многострочных формул, поэтому свой поповер:
// на десктопе — по наведению, на тач-устройствах — по нажатию.
export function Tooltip({ children, content, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!content) return children;

  return (
    <span
      ref={ref}
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

      {open && (
        <span
          role="tooltip"
          className={`absolute bottom-full mb-1.5 z-50 w-max max-w-[min(20rem,80vw)]
            rounded-lg border border-indigo-500/20 bg-slate-900/95 px-3 py-2
            text-xs font-normal text-slate-300 shadow-xl backdrop-blur-sm
            ${align === "right" ? "right-0" : "left-0"}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
