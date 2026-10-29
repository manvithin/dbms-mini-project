import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl2 border border-line bg-white shadow-soft ${className}`}>
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className = "",
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`rounded-xl2 border border-line bg-white shadow-soft ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
