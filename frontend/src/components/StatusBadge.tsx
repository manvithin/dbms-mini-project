import { statusDot, statusTone } from "../utils/format";

export function StatusBadge({ status, subtle = false }: { status: string; subtle?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(status)} ${
        subtle ? "opacity-90" : ""
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot(status)}`} aria-hidden="true" />
      {status}
    </span>
  );
}
