import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-muted sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
