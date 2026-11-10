import { createContext, useContext, useId, useRef } from "react";
import { ChevronDown, Loader } from "lucide-react";
import { localIsoDate } from "../../lib/utils";

/*
 * Примитивы форм. Правила:
 * — подпись всегда над полем (Field), плейсхолдер — только пример значения;
 * — ошибка под своим полем: aria-invalid + aria-describedby, текст называет, что исправить;
 * — проверка при отправке, а не во время набора; первое ошибочное поле получает фокус
 *   (useFocusFirstError);
 * — кнопка отправки активна, пока не нажата, и называет действие словами.
 */

const FieldContext = createContext(null);

// Поле с подписью, подсказкой и ошибкой. optional — приписка «необязательно» к подписи
// (обязательные поля не помечаются: их в формах большинство).
export function Field({ label, hint, error, optional = false, className = "", children }) {
  const id = useId();
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="font-normal text-stone-500"> · необязательно</span>}
      </label>
      <FieldContext.Provider value={{ id, messageId, invalid: Boolean(error) }}>
        {children}
      </FieldContext.Provider>
      {error ? (
        <p id={messageId} className="field-error">{error}</p>
      ) : hint ? (
        <p id={messageId} className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

// id и aria-атрибуты из ближайшего Field
function useFieldProps(props) {
  const field = useContext(FieldContext);
  if (!field) return props;
  return {
    id: field.id,
    "aria-invalid": field.invalid || undefined,
    "aria-describedby": field.messageId,
    ...props,
  };
}

export function Input({ className = "", ...props }) {
  return <input {...useFieldProps(props)} className={`input ${className}`} />;
}

export function Textarea({ className = "", rows = 3, ...props }) {
  return <textarea rows={rows} {...useFieldProps(props)} className={`input ${className}`} />;
}

// Нативный select (на телефоне — системный список) со своей стрелкой
export function Select({ className = "", wrapperClassName = "", children, ...props }) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select {...useFieldProps(props)} className={`input ${className}`}>
        {children}
      </select>
      <ChevronDown size={16} aria-hidden="true"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
    </div>
  );
}

// Дата с быстрыми кнопками: игры вносят в тот же вечер или на следующий день
export function DateInput({ value, onChange, className = "", ...props }) {
  const quick = [
    { label: "Сегодня", date: localIsoDate() },
    { label: "Вчера", date: localIsoDate(-1) },
  ];
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 sm:flex-none sm:!w-44" {...props} />
      {quick.map(({ label, date }) => (
        <button key={label} type="button" onClick={() => onChange(date)} aria-pressed={value === date}
          className={`btn-sm !px-2.5 !min-h-[44px] sm:!min-h-[40px] shrink-0 rounded-[10px] border cursor-pointer ${
            value === date
              ? "border-accent-400/40 bg-accent-400/10 text-accent-200"
              : "border-line-strong text-stone-400 hover:text-stone-200 hover:bg-elev-2"
          }`}>
          {label}
        </button>
      ))}
    </div>
  );
}

// Переключатель с подписью; вся строка — цель нажатия
export function Switch({ checked, onChange, label, description, disabled = false }) {
  const id = useId();
  return (
    <div className={`flex items-start justify-between gap-4 py-1 ${disabled ? "opacity-50" : ""}`}>
      <label htmlFor={id} className={`min-w-0 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
        <span className="block text-sm text-stone-200">{label}</span>
        {description && <span className="block text-[13px] text-stone-500 mt-0.5">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="switch mt-0.5 cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
}

// Выбор одного варианта из нескольких: radiogroup, стрелки двигают выбор.
// options: [{ value, label, icon?, disabled?, className?, activeClassName? }]
export function Segmented({ value, onChange, options, label, className = "", size = "md", invalid = false }) {
  const refs = useRef([]);
  const activeIdx = options.findIndex((o) => o.value === value);

  const move = (from, dir) => {
    for (let step = 1; step <= options.length; step++) {
      const i = (from + dir * step + options.length) % options.length;
      if (!options[i].disabled) {
        onChange(options[i].value);
        refs.current[i]?.focus();
        return;
      }
    }
  };

  const onKeyDown = (e, idx) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(idx, 1); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(idx, -1); }
  };

  return (
    <div role="radiogroup" aria-label={label} aria-invalid={invalid || undefined} className={`segmented ${className}`}>
      {options.map((o, idx) => {
        const Icon = o.icon;
        const checked = o.value === value;
        // В порядок Tab попадает выбранный вариант, а если ничего не выбрано — первый
        const tabbable = checked || (activeIdx === -1 && idx === 0);
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[idx] = el; }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={tabbable ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, idx)}
            className={`cursor-pointer ${size === "sm" ? "!min-h-[34px] !text-[13px]" : ""} ${o.className || ""} ${checked ? o.activeClassName || "" : ""}`}
          >
            {Icon && <Icon size={16} aria-hidden="true" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Кнопка системы. loading — спиннер и блокировка только на время отправки.
export function Button({
  variant = "primary", size = "md", loading = false, icon: Icon,
  className = "", children, disabled, type = "button", ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`btn-${variant} btn-${size} cursor-pointer ${className}`}
      {...props}
    >
      {loading ? <Loader size={16} className="animate-spin" aria-hidden="true" />
        : Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

// Строка состояния формы: зачитывается при изменении
export function FormStatus({ children, tone = "error", className = "" }) {
  const tones = { error: "text-red-400", warning: "text-amber-300", muted: "text-stone-400" };
  return (
    <p role="status" className={`text-sm ${tones[tone]} ${className}`}>
      {children}
    </p>
  );
}
