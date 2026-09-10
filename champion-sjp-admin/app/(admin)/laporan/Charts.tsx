// Chart batang horizontal ringan (CSS, server-rendered, tanpa library/JS).
// Tiap batang selalu menampilkan angka → warna hanya redundan (aman buta warna).

export type Tone = "brand" | "ok" | "warn" | "bad" | "info";
const TONE: Record<Tone, string> = {
  brand: "#d81f26", ok: "#16a34a", warn: "#f59e0b", bad: "#dc2626", info: "#2563eb",
};

export type BarDatum = { label: string; value: number; tone?: Tone; display?: string };

export default function BarChart({
  data, unit = "", max, labelWidth = "9rem", empty = "Tidak ada data.",
}: {
  data: BarDatum[];
  unit?: string;
  max?: number;          // skala; default = nilai terbesar
  labelWidth?: string;
  empty?: string;
}) {
  if (!data.length) return <div className="text-sm text-mut">{empty}</div>;
  const hi = Math.max(1, max ?? Math.max(...data.map((d) => d.value)));
  return (
    <div className="space-y-1">
      {data.map((d, i) => {
        const w = Math.max(2, Math.round((d.value / hi) * 100)); // min 2% agar terlihat
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="shrink-0 truncate text-mut" style={{ width: labelWidth }} title={d.label}>{d.label}</div>
            <div className="flex-1 h-2.5 rounded-full bg-line overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${w}%`, background: TONE[d.tone || "brand"] }} />
            </div>
            <div className="shrink-0 w-14 text-right tabular-nums font-semibold">{d.display ?? d.value}{unit}</div>
          </div>
        );
      })}
    </div>
  );
}

// Batang stacked proporsi tier (mis. sebaran compliance). Ringkas, tinggi ~10px + legenda.
export function DistBar({ segments, total }: { segments: { label: string; value: number; tone: Tone }[]; total?: number }) {
  const sum = total ?? segments.reduce((a, s) => a + s.value, 0);
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-line gap-px">
        {segments.map((s, i) =>
          s.value > 0 ? (
            <div key={i} style={{ width: `${sum ? (s.value / sum) * 100 : 0}%`, background: TONE[s.tone] }} title={`${s.label}: ${s.value}`} />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
        {segments.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-mut">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: TONE[s.tone] }} />
            {s.label}: <b className="text-ink tabular-nums">{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
