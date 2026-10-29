import type { ReactNode } from "react";

export function PrintHeader({
  documentTitle,
  subtitle,
}: {
  documentTitle: string;
  subtitle?: string;
}) {
  return (
    <header className="border-b-2 border-brand-800 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight text-brand-900">General Hospital</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Outpatient department | Bengaluru
          </p>
        </div>
        <div className="text-right text-xs leading-5 text-muted">
          <p>Reception +91 80 4000 1200</p>
          <p>Monday to Saturday, 8:00 AM to 6:00 PM</p>
          <p>Sunday: emergency care only</p>
        </div>
      </div>
      <div className="mt-5">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{documentTitle}</h1>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-muted">{subtitle}</p> : null}
      </div>
    </header>
  );
}

export function PrintFooter({ note }: { note?: string }) {
  const generated = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

  return (
    <footer className="mt-8 border-t border-line pt-4 text-[11px] leading-5 text-muted">
      <p>{note ?? "Generated from the General Hospital outpatient management system."}</p>
      <p className="mt-1">Printed on {generated} | Synthetic demonstration data, not a real medical record.</p>
    </footer>
  );
}

export function PrintSection({
  title,
  children,
  breakAvoid = false,
}: {
  title: string;
  children: ReactNode;
  breakAvoid?: boolean;
}) {
  return (
    <section className={`mt-6 ${breakAvoid ? "print-break-avoid" : ""}`}>
      <h2 className="border-b border-line pb-2 font-display text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
