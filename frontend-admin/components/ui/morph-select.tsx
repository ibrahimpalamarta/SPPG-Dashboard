"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type Option = { value: string; label: string };

/**
 * Dropdown without the native popup: the trigger itself grows into the option list. Works controlled
 * (`value` + `onChange`) or in a plain form (`name` + `defaultValue`), where the value is submitted
 * through an invisible text input so `required` still blocks an empty choice.
 */
export function MorphSelect({
  name,
  label,
  options,
  value,
  defaultValue = "",
  onChange,
  required,
  className = "w-48",
}: {
  name?: string;
  label: string;
  options: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  const [inner, setInner] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = value ?? inner;

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const pick = (v: string) => {
    setInner(v);
    setOpen(false);
    onChange?.(v);
  };

  return (
    <div ref={ref} className={`relative h-10 ${className}`} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      {name && <input name={name} value={current} required={required} onChange={() => {}} tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0" />}
      <div className={`absolute inset-x-0 top-0 z-20 overflow-hidden rounded-lg border border-slate-200 bg-white transition-shadow duration-200 ${open ? "shadow-lg" : ""}`}>
        <button
          type="button"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          onClick={() => setOpen(!open)}
          className="flex h-10 w-full items-center justify-between gap-2 px-3 text-sm text-slate-800"
        >
          <span className="truncate">{options.find((o) => o.value === current)?.label}</span>
          <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div id={listId} role="listbox" aria-label={label} inert={!open} className="min-h-0 overflow-hidden">
            <div className="max-h-64 overflow-y-auto border-t border-slate-100 p-1">
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={o.value === current}
                  onClick={() => pick(o.value)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === current && <Check className="size-4 shrink-0 text-slate-500" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
