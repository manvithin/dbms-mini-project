import type { ReactNode } from "react";

type Tone = "brand" | "gold" | "sky" | "rose" | "violet" | "emerald" | "orange" | "cyan";

const tones: Record<Tone, { card: string; icon: string; value: string; bar: string; blob: string }> = {
  brand: {
    card: "border-brand-100 from-brand-50 via-white to-white",
    icon: "from-brand-600 to-brand-800 shadow-brand-200/60",
    value: "text-brand-900",
    bar: "bg-brand-500",
    blob: "bg-brand-200/45",
  },
  sky: {
    card: "border-sky-100 from-sky-50 via-white to-white",
    icon: "from-sky-500 to-blue-600 shadow-sky-200/60",
    value: "text-sky-900",
    bar: "bg-sky-500",
    blob: "bg-sky-200/45",
  },
  gold: {
    card: "border-amber-100 from-amber-50 via-white to-white",
    icon: "from-amber-400 to-orange-500 shadow-amber-200/60",
    value: "text-amber-900",
    bar: "bg-amber-500",
    blob: "bg-amber-200/45",
  },
  rose: {
    card: "border-rose-100 from-rose-50 via-white to-white",
    icon: "from-rose-500 to-pink-600 shadow-rose-200/60",
    value: "text-rose-900",
    bar: "bg-rose-500",
    blob: "bg-rose-200/45",
  },
  violet: {
    card: "border-violet-100 from-violet-50 via-white to-white",
    icon: "from-violet-500 to-purple-600 shadow-violet-200/60",
    value: "text-violet-900",
    bar: "bg-violet-500",
    blob: "bg-violet-200/45",
  },
  emerald: {
    card: "border-emerald-100 from-emerald-50 via-white to-white",
    icon: "from-emerald-500 to-teal-600 shadow-emerald-200/60",
    value: "text-emerald-900",
    bar: "bg-emerald-500",
    blob: "bg-emerald-200/45",
  },
  orange: {
    card: "border-orange-100 from-orange-50 via-white to-white",
    icon: "from-orange-400 to-red-500 shadow-orange-200/60",
    value: "text-orange-900",
    bar: "bg-orange-500",
    blob: "bg-orange-200/45",
  },
  cyan: {
    card: "border-cyan-100 from-cyan-50 via-white to-white",
    icon: "from-cyan-500 to-teal-600 shadow-cyan-200/60",
    value: "text-cyan-900",
    bar: "bg-cyan-500",
    blob: "bg-cyan-200/45",
  },
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: ReactNode;
  tone?: Tone;
}) {
  const selected = tones[tone];
  return (
    <div className={`relative overflow-hidden rounded-xl2 border bg-gradient-to-br p-5 shadow-soft ${selected.card}`}>
      <div className={`pointer-events-none absolute -right-9 -top-10 h-28 w-28 rounded-full ${selected.blob}`} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-muted">{label}</p>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${selected.icon}`}>
          {icon}
        </span>
      </div>
      <p className={`relative mt-3 font-display text-4xl font-semibold tracking-tight ${selected.value}`}>{value}</p>
      {hint ? <p className="relative mt-1 text-xs leading-5 text-muted">{hint}</p> : null}
      <div className={`relative mt-4 h-1.5 w-14 rounded-full ${selected.bar}`} aria-hidden="true" />
    </div>
  );
}
