export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({
  items,
  value,
  onChange,
  label = "View",
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
              selected ? "bg-white text-brand-800 shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
            {typeof item.count === "number" ? (
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${selected ? "bg-brand-100 text-brand-800" : "bg-slate-200 text-slate-600"}`}>
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
