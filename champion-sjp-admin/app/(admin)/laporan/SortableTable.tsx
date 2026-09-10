"use client";

import { useState } from "react";

export type Col = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  fmt?: "text" | "int" | "pct" | "rp" | "date" | "datetime" | "pill" | "tag" | "bar";
};

const rp = (n: any) => "Rp " + Number(n || 0).toLocaleString("id");
const TONE_HEX: Record<string, string> = { "p-ok": "#16a34a", "p-warn": "#f59e0b", "p-bad": "#dc2626", "p-mut": "#9ca3af" };
const alignCls = (a?: string) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");

// Tabel dengan sort klik header (client-side). rows = objek plain (nilai numerik untuk sort).
// Untuk fmt "pill" (compliance %), warna tone diambil dari row["__tone_"+key].
export default function SortableTable({
  columns, rows, initial, empty = "Tidak ada data.",
}: {
  columns: Col[];
  rows: any[];
  initial?: { key: string; dir: "asc" | "desc" };
  empty?: string;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>(initial || { key: columns[0].key, dir: "asc" });

  if (rows.length === 0) return <div className="text-sm text-mut">{empty}</div>;

  const sorted = [...rows].sort((a, b) => {
    const va = a[sort.key], vb = b[sort.key];
    let c: number;
    if (typeof va === "number" && typeof vb === "number") c = va - vb;
    else c = String(va ?? "").localeCompare(String(vb ?? ""), "id", { numeric: true });
    return sort.dir === "asc" ? c : -c;
  });

  const click = (k: string) =>
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" }));

  const cell = (c: Col, row: any) => {
    const v = row[c.key];
    if (c.fmt === "rp") return rp(v);
    if (c.fmt === "pct") return `${v}%`;
    if (c.fmt === "date") return v ? new Date(v).toLocaleDateString("id") : "—";
    if (c.fmt === "datetime") {
      if (!v) return "—";
      const [d, t] = String(v).split(" ");
      return `${new Date(d).toLocaleDateString("id")}${t ? " " + t : ""}`;
    }
    if (c.fmt === "pill") return <span className={`pill ${row["__tone_" + c.key] || "p-mut"}`}>{v}%</span>;
    if (c.fmt === "bar") {
      const tone = row["__tone_" + c.key] || "p-mut";
      const w = Math.max(2, Math.min(100, Number(v) || 0));
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${w}%`, background: TONE_HEX[tone] || "#9ca3af" }} />
          </div>
          <span className="tabular-nums font-semibold w-9 text-right">{v}%</span>
        </div>
      );
    }
    if (c.fmt === "tag") return v ? <span className="pill p-warn">{v}</span> : "—";
    return v ?? "—";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} onClick={() => click(c.key)}
                className={`th cursor-pointer select-none hover:text-brand ${alignCls(c.align)}`}>
                {c.label}
                <span className="text-[10px]">{sort.key === c.key ? (sort.dir === "asc" ? " ▲" : " ▼") : " ⇅"}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.__key ?? i} className="hover:bg-[#fafafa]">
              {columns.map((c) => (
                <td key={c.key} className={`td ${alignCls(c.align)} ${c.fmt === "rp" ? "tabular-nums" : ""} ${c.key === columns[0].key ? "font-semibold" : ""}`}>
                  {cell(c, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
