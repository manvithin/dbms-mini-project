import type { ReactNode } from "react";
import { BackButton } from "./BackButton";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  showBack = true,
  backTo,
  backLabel,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  showBack?: boolean;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-7 animate-fade-up">
      {showBack ? <BackButton to={backTo} label={backLabel} className="mb-4" /> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p>
          ) : null}
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 text-sm leading-6 text-muted sm:text-base">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
