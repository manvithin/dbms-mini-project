export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl2 border border-line bg-white p-6 shadow-soft">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-7 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="mt-6 h-11 w-36" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4" role="status">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  );
}
