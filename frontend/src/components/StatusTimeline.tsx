import type { StatusHistory } from "../types";
import { formatDateTime } from "../utils/format";
import { StatusBadge } from "./StatusBadge";

export function StatusTimeline({ history }: { history: StatusHistory[] }) {
  if (!history.length) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-slate-50 px-4 py-5 text-sm text-muted">
        No status changes have been recorded for this appointment yet.
      </p>
    );
  }
  const ordered = [...history].sort(
    (left, right) => new Date(left.changed_at).getTime() - new Date(right.changed_at).getTime(),
  );
  return (
    <ol className="relative space-y-5 border-l border-line pl-6">
      {ordered.map((entry) => (
        <li key={entry.history_id} className="relative">
          <span className="absolute -left-[1.9rem] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={entry.new_status} />
            <span className="text-xs text-muted">{formatDateTime(entry.changed_at)}</span>
          </div>
          <p className="mt-1.5 text-sm text-muted">
            Changed from <span className="font-medium text-ink">{entry.old_status}</span> to{" "}
            <span className="font-medium text-ink">{entry.new_status}</span>.
          </p>
        </li>
      ))}
    </ol>
  );
}
