import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination as PaginationShape } from "../types";

export function Pagination({
  pagination,
  onPageChange,
  label = "records",
}: {
  pagination: PaginationShape;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (pagination.total === 0) return null;
  const start = (pagination.page - 1) * pagination.per_page + 1;
  const end = Math.min(pagination.page * pagination.per_page, pagination.total);
  return (
    <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-line pt-5 sm:flex-row">
      <p className="text-sm text-muted">
        Showing <span className="font-semibold text-ink">{start}</span> to{" "}
        <span className="font-semibold text-ink">{end}</span> of{" "}
        <span className="font-semibold text-ink">{pagination.total}</span> {label}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.has_prev}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </button>
        <span className="min-w-[4.5rem] text-center text-sm font-medium text-muted">
          {pagination.page} of {Math.max(1, pagination.pages)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!pagination.has_next}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
