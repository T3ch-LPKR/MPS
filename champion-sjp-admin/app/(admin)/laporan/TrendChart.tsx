"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// Chart kombinasi harian ala TrailingChart (Power BI): batang berkelompok + garis %,
// tombol metrik multi-pilih. SVG tulisan tangan, tanpa library.
// Klik label tanggal / batang -> filter ?day= (klik lagi tanggal yang sama = hapus filter).

export type TrendRow = {
  d: string;       // YYYY-MM-DD
  plan: number; done: number; oos: number; ec: number;
  arfu: number; arc: number; cust: number; visit: number;
};

type Metric = { key: string; label: string; kind: "bar" | "line"; color: string; scale: "count" | "rp" | "pct" };

const METRICS: Metric[] = [
  { key: "plan", label: "Plan", kind: "bar", color: "#4472C4", scale: "count" },
  { key: "done", label: "Realization", kind: "bar", color: "#ED7D31", scale: "count" },
  { key: "oos", label: "OOS", kind: "bar", color: "#A5A5A5", scale: "count" },
  { key: "ec", label: "EC", kind: "bar", color: "#FFC000", scale: "count" },
  { key: "arfu", label: "AR FU", kind: "bar", color: "#5B9BD5", scale: "count" },
  { key: "arc", label: "AR Coll", kind: "bar", color: "#70AD47", scale: "rp" },
  { key: "cust", label: "Cust Dikunjungi", kind: "bar", color: "#264478", scale: "count" },
  { key: "comp", label: "Compliance %", kind: "line", color: "#C00000", scale: "pct" },
  { key: "ecpct", label: "EC %", kind: "line", color: "#7030A0", scale: "pct" },
];

const DEFAULT_SEL = ["done", "oos", "ecpct"];
const mn = (n: number) => (n >= 1e9 ? `${(n / 1e9).toLocaleString("id", { maximumFractionDigits: 1 })}B` : `${Math.round(n / 1e6)}M`);

export default function TrendChart({
  rows, params, activeDay, lovActive,
}: {
  rows: TrendRow[];
  params: Record<string, string>; // query saat ini tanpa "day" (untuk membangun URL klik)
  activeDay: string | null;
  lovActive: boolean;             // saat filter catatan aktif, Plan & Compliance tidak relevan
}) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>(DEFAULT_SEL);

  const toggle = (k: string) =>
    setSel((s) => (s.includes(k) ? (s.length > 1 ? s.filter((x) => x !== k) : s) : [...s, k]));
  const allKeys = METRICS.map((m) => m.key);
  const isAll = sel.length === allKeys.length;

  const gotoDay = (d: string) => {
    const p = new URLSearchParams(params);
    if (activeDay !== d) p.set("day", d);
    router.push(`/laporan/dashboard?${p.toString()}`);
  };

  const data = useMemo(() => rows.map((r) => ({
    ...r,
    comp: r.plan ? Math.round((r.done / r.plan) * 100) : null,
    ecpct: r.visit ? Math.round((r.ec / r.visit) * 100) : null,
  })), [rows]);

  const bars = METRICS.filter((m) => m.kind === "bar" && sel.includes(m.key) && !(lovActive && m.key === "plan"));
  const lines = METRICS.filter((m) => m.kind === "line" && sel.includes(m.key) && !(lovActive && m.key === "comp"));

  // ==== geometri ====
  const H = 240, PADT = 24, PADB = 34, PADL = 8, PADR = 8;
  const plotH = H - PADT - PADB;
  const n = data.length;
  const groupW = Math.max(26, Math.min(56, Math.floor(1180 / Math.max(1, n))));
  const W = PADL + PADR + n * groupW;
  const barSlot = bars.length ? Math.max(3, Math.floor((groupW - 8) / bars.length)) : 0;
  const showBarLabel = barSlot >= 13;

  const maxCount = Math.max(1, ...data.flatMap((r) => bars.filter((b) => b.scale === "count").map((b) => Number((r as any)[b.key]) || 0)));
  const maxRp = Math.max(1, ...data.map((r) => (bars.some((b) => b.scale === "rp") ? Number(r.arc) || 0 : 0)));
  const maxPct = Math.max(10, ...data.flatMap((r) => lines.map((l) => Number((r as any)[l.key]) || 0)));

  const yBar = (m: Metric, v: number) => plotH * (v / (m.scale === "rp" ? maxRp : maxCount));
  const yLine = (v: number) => PADT + plotH - plotH * (v / maxPct);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button type="button" onClick={() => setSel(isAll ? DEFAULT_SEL : allKeys)}
          className={`btn btn-sm !px-2.5 ${isAll ? "!bg-[#2B579A] !text-white !border-[#2B579A]" : ""}`}>All</button>
        {METRICS.map((m) => {
          const on = sel.includes(m.key);
          return (
            <button key={m.key} type="button" onClick={() => toggle(m.key)}
              className={`btn btn-sm !px-2.5 ${on ? "!bg-[#2B579A] !text-white !border-[#2B579A]" : ""}`}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: m.color }} />
              {m.label}
            </button>
          );
        })}
      </div>

      {n === 0 ? <div className="text-sm text-mut">Tidak ada data pada periode ini.</div> : (
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="max-w-none" role="img" aria-label="Tren harian SJP">
            {/* garis dasar */}
            <line x1={PADL} y1={PADT + plotH} x2={W - PADR} y2={PADT + plotH} stroke="#e8eaee" strokeWidth={1} />
            {data.map((r, i) => {
              const x0 = PADL + i * groupW;
              const dayNum = Number(r.d.slice(8, 10));
              const isActive = activeDay === r.d;
              const bw = barSlot - 1;
              const totalBarsW = bars.length * barSlot;
              const startX = x0 + (groupW - totalBarsW) / 2;
              return (
                <g key={r.d} onClick={() => gotoDay(r.d)} className="cursor-pointer">
                  {/* latar kolom (hover/aktif) */}
                  <rect x={x0} y={PADT - 4} width={groupW} height={plotH + 8}
                    fill={isActive ? "#2B579A" : "transparent"} opacity={isActive ? 0.08 : 0} />
                  {bars.map((b, bi) => {
                    const v = Number((r as any)[b.key]) || 0;
                    const h = yBar(b, v);
                    const x = startX + bi * barSlot;
                    return (
                      <g key={b.key}>
                        <rect x={x} y={PADT + plotH - h} width={bw} height={h} fill={b.color} rx={1} />
                        {showBarLabel && v > 0 ? (
                          <text x={x + bw / 2} y={PADT + plotH - h - 3} fontSize={8.5} textAnchor="middle" fill="#6b7280">
                            {b.scale === "rp" ? mn(v) : v}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                  <text x={x0 + groupW / 2} y={H - PADB + 14} fontSize={10} textAnchor="middle"
                    fill={isActive ? "#2B579A" : "#6b7280"} fontWeight={isActive ? 700 : 400}>{dayNum}</text>
                </g>
              );
            })}
            {/* garis % */}
            {lines.map((l) => {
              const pts = data.map((r, i) => {
                const v = (r as any)[l.key];
                return v == null ? null : { x: PADL + i * groupW + groupW / 2, y: yLine(Number(v)), v: Number(v) };
              });
              const path = pts.map((p, i) => (p ? `${i === 0 || !pts[i - 1] ? "M" : "L"}${p.x},${p.y}` : "")).join(" ");
              return (
                <g key={l.key}>
                  <path d={path} fill="none" stroke={l.color} strokeWidth={2} />
                  {pts.map((p, i) => p ? (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r={2.5} fill={l.color} />
                      <text x={p.x} y={p.y - 6} fontSize={8.5} textAnchor="middle" fill={l.color} fontWeight={600}>{p.v}%</text>
                    </g>
                  ) : null)}
                </g>
              );
            })}
          </svg>
        </div>
      )}
      <div className="text-[11px] text-mut mt-1">
        Klik tanggal untuk memfilter halaman ke hari itu (klik lagi untuk melepas).
        {bars.some((b) => b.scale === "rp") ? " AR Coll memakai skala sendiri (juta Rupiah)." : ""}
      </div>
    </div>
  );
}
