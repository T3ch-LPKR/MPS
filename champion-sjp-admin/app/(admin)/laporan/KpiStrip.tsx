// KPI strip padat: satu panel grid tersambung (divider 1px). Server-rendered, CSS-only.
export type KpiItem = { label: string; value: React.ReactNode; sub?: React.ReactNode; lead?: boolean };

export default function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px bg-line border border-line rounded-xl overflow-hidden mb-4">
      {items.map((it, i) => (
        <div key={i} className="bg-white px-3.5 py-2.5">
          <div className="text-[10px] uppercase tracking-wide text-mut font-semibold truncate">{it.label}</div>
          <div className={`text-xl font-extrabold tabular-nums leading-tight mt-0.5 ${it.lead ? "text-brand" : ""}`}>{it.value}</div>
          {it.sub ? <div className="text-[11px] text-mut mt-0.5 truncate">{it.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}
