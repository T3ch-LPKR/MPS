// KPI strip padat: satu panel grid tersambung (divider 1px). Server-rendered, CSS-only.
export type KpiItem = { label: string; value: React.ReactNode; sub?: React.ReactNode; lead?: boolean };

export default function KpiStrip({ items, size }: { items: KpiItem[]; size?: "lg" }) {
  // size="lg": gaya kartu KPI Power BI — angka besar rata tengah, label di bawah.
  if (size === "lg") {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] max-[600px]:grid-cols-2 gap-px bg-line border border-line rounded-xl overflow-hidden mb-4">
        {items.map((it, i) => (
          <div key={i} className="bg-white px-2 py-3 text-center">
            <div className={`text-[26px] font-extrabold tabular-nums leading-tight ${it.lead ? "text-brand" : ""}`}>{it.value}</div>
            <div className="text-[10px] uppercase tracking-wide text-mut font-semibold mt-1 truncate">{it.label}</div>
            {it.sub ? <div className="text-[11px] text-mut mt-0.5 truncate">{it.sub}</div> : null}
          </div>
        ))}
      </div>
    );
  }
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
