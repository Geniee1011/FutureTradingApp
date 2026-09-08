"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { IconChevron, IconUpload } from "./icons";

const CONTROL =
  "w-full rounded-lg border border-[var(--l-line)] bg-white px-3.5 text-[13.5px] text-[var(--l-ink)] " +
  "placeholder:text-[var(--l-body)]/55 focus:border-[var(--l-blue-500)] focus:outline-none " +
  "focus:ring-2 focus:ring-[var(--l-blue-500)]/20 disabled:opacity-50";

function Label({ htmlFor, children, required }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[12.5px] font-semibold text-[var(--l-ink)]">
      {children}
      {required && (
        <span className="ml-1 text-[var(--l-red)]" aria-hidden>
          *
        </span>
      )}
    </label>
  );
}

/** Inline validation message, tied to its control via aria-describedby. */
function Error({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-[11.5px] font-medium text-[var(--l-red)]">
      {children}
    </p>
  );
}

interface Common {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
}

export function TextField({
  label,
  required,
  error,
  hint,
  className,
  ...props
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        className={cn(CONTROL, "h-10", error && "border-[var(--l-red)] focus:border-[var(--l-red)]")}
        {...props}
      />
      {error ? <Error id={errId}>{error}</Error> : hint ? (
        <p className="mt-1.5 text-[11.5px] text-[var(--l-body)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  required,
  error,
  hint,
  className,
  children,
  ...props
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className={cn(
            CONTROL,
            "h-10 appearance-none pr-9",
            error && "border-[var(--l-red)] focus:border-[var(--l-red)]",
          )}
          {...props}
        >
          {children}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--l-body)]"
        >
          <IconChevron />
        </span>
      </div>
      {error ? <Error id={errId}>{error}</Error> : hint ? (
        <p className="mt-1.5 text-[11.5px] text-[var(--l-body)]">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Document upload control.
 *
 * Presentational only — it reports the chosen file's name so the step can show
 * what was picked, but nothing is transmitted or stored. Uploading is part of
 * the backend work that is explicitly out of scope here.
 */
export function FileField({
  label,
  required,
  error,
  hint,
  fileName,
  onFile,
  accept = "image/png,image/jpeg,application/pdf",
  className,
}: Common & {
  fileName?: string;
  onFile: (name: string | undefined) => void;
  accept?: string;
  className?: string;
}) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3.5 py-4 transition-colors",
          error
            ? "border-[var(--l-red)] bg-[var(--l-red)]/[0.03]"
            : "border-[var(--l-line)] bg-[var(--l-paper-2)] hover:border-[var(--l-blue-500)]",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-2 text-[var(--l-blue-500)] ring-1 ring-[var(--l-line)]">
          <IconUpload />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-[var(--l-ink)]">
            {fileName ?? "Choose a file"}
          </span>
          <span className="block text-[11.5px] text-[var(--l-body)]">PNG, JPG or PDF · max 10 MB</span>
        </span>
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => onFile(e.target.files?.[0]?.name)}
      />
      {error ? <Error id={errId}>{error}</Error> : hint ? (
        <p className="mt-1.5 text-[11.5px] text-[var(--l-body)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function CheckboxField({
  label,
  error,
  checked,
  onChange,
}: {
  label: ReactNode;
  error?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--l-line)] text-[var(--l-red)] accent-[var(--l-red)]"
        />
        <label htmlFor={id} className="text-[13px] leading-relaxed text-[var(--l-body)]">
          {label}
        </label>
      </div>
      {error && <Error id={errId}>{error}</Error>}
    </div>
  );
}
