"use client";

import { X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { CmsIcon, ICON_OPTIONS } from "@/lib/icons";
import { cn } from "@/lib/utils";

/* ---------- Düzen ---------- */

export function Panel({
  title,
  description,
  children,
  actions,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface/60", className)}>
      <header className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </header>
      <div className="space-y-5 p-5">{children}</div>
    </section>
  );
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 2 && "md:grid-cols-2",
        cols === 3 && "md:grid-cols-3",
        cols === 4 && "sm:grid-cols-2 xl:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}

function Label({ htmlFor, label, hint, counter }: { htmlFor: string; label: string; hint?: string; counter?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-xs font-medium text-fg">
        {label}
        {hint ? <span className="ml-2 font-normal text-muted">{hint}</span> : null}
      </label>
      {counter ? <span className="font-mono text-[10px] text-muted">{counter}</span> : null}
    </div>
  );
}

/* ---------- Alanlar ---------- */

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  maxLength,
  multiline = false,
  rows = 3,
  type = "text",
  mono = false,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  rows?: number;
  type?: "text" | "url" | "email" | "date";
  mono?: boolean;
  className?: string;
}) {
  const id = useId();
  const counter = maxLength ? `${value.length}/${maxLength}` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} hint={hint} counter={counter} />
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={cn("input resize-y text-sm leading-6", mono && "font-mono text-xs")}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={cn("input text-sm", mono && "font-mono text-xs")}
        />
      )}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  hint,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  suffix?: string;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} label={label} hint={hint} />
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className={cn("input font-mono text-sm", suffix && "pr-12")}
        />
        {suffix ? <span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-muted">{suffix}</span> : null}
      </div>
    </div>
  );
}

export function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} label={label} counter={`${value}${unit}`} />
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#06b6d4]"
      />
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-deep/60 px-4 py-3">
      <span>
        <span className="block text-xs font-medium text-fg">{label}</span>
        {description ? <span className="mt-0.5 block text-[11px] leading-4 text-muted">{description}</span> : null}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className="relative h-5 w-9 shrink-0 rounded-full border border-line bg-surface transition peer-checked:border-primary peer-checked:bg-primary/25 peer-focus-visible:outline-2 peer-focus-visible:outline-primary after:absolute after:top-0.5 after:left-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:bg-muted after:transition peer-checked:after:translate-x-4 peer-checked:after:bg-primary"
      />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} label={label} hint={hint} />
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className="input text-sm">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function IconField({
  label = "İkon",
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} label={label} />
      <div className="flex gap-2">
        <span className="flex w-10 shrink-0 items-center justify-center rounded-[0.625rem] border border-line bg-deep">
          <CmsIcon name={value} className="h-4 w-4 text-primary" />
        </span>
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input text-sm">
          {ICON_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} ({o.value})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function TagsField({
  label,
  value,
  onChange,
  hint = "Enter veya virgül ile ekleyin",
  placeholder = "Yeni etiket…",
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => !value.includes(p));
    if (parts.length) onChange([...value, ...parts]);
    setDraft("");
  };

  return (
    <div>
      <Label htmlFor={id} label={label} hint={hint} counter={`${value.length}`} />
      <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-[0.625rem] border border-line bg-deep px-2 py-1.5 focus-within:border-primary">
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 text-xs text-fg"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="text-muted transition hover:text-red-400"
              aria-label={`${tag} etiketini kaldır`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => {
            if (e.target.value.includes(",")) commit(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && commit(draft)}
          className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm text-fg outline-none placeholder:text-muted/60"
        />
      </div>
    </div>
  );
}

export function SmallButton({
  children,
  onClick,
  variant = "default",
  disabled,
  title,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "warm";
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        variant === "default" && "border-line text-muted hover:border-primary/50 hover:text-fg",
        variant === "primary" && "border-primary bg-primary text-deep hover:bg-[#22c3de]",
        variant === "danger" && "border-red-500/30 text-red-300 hover:border-red-500/60 hover:bg-red-500/10",
        variant === "warm" && "border-warm/40 text-warm hover:bg-warm/10",
      )}
    >
      {children}
    </button>
  );
}
