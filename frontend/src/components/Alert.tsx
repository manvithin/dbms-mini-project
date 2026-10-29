import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import type { ReactNode } from "react";

type Variant = "error" | "success" | "info" | "warning";

const styles: Record<Variant, string> = {
  error: "border-rose-200 bg-rose-50 text-rose-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  info: "border-brand-200 bg-brand-50 text-brand-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
};

const icons: Record<Variant, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  warning: AlertCircle,
};

export function Alert({
  variant = "info",
  title,
  children,
  onDismiss,
}: {
  variant?: Variant;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const Icon = icons[variant];
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${styles[variant]}`} role="alert">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm leading-6">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? "mt-0.5" : ""}>{children}</div>
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          aria-label="Dismiss message"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
