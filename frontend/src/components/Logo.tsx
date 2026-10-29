import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export function Logo({ to = "/", compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
      aria-label="General Hospital home"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white shadow-soft transition group-hover:bg-brand-800">
        <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-semibold tracking-tight text-ink">General Hospital</span>
        {!compact ? <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Outpatient care</span> : null}
      </span>
    </Link>
  );
}
