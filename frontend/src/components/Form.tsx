import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const controlClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
        {required ? <span className="ml-1 text-rose-600" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-700" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid, className = "", ...props }: InputProps) {
  return (
    <input
      className={`${controlClass} ${invalid ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""} ${className}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ invalid, className = "", children, ...props }: SelectProps) {
  return (
    <select
      className={`${controlClass} ${invalid ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""} ${className}`}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ invalid, className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`${controlClass} min-h-[110px] resize-y ${invalid ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""} ${className}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
