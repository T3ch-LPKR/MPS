"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// Matriks catatan kunjungan (kategori > teks) ala Lippo Tables BI:
// baris bisa dilipat per kategori, mode Chart (data bar) / Tabel, klik teks -> filter ?lov=.

export type NoteRow = { kategori: string; teks: string; lov_id: number; n: number };

export default function NotesMatrix({
  rows, params, activeLov,
}: {
  rows: NoteRow[];
  params: Record<string, string>; // query saat ini tanpa "lov"
  activeLov: number | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"chart" | "table">("chart");
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const m = new Map<string, { total: number; items: NoteRow[] }>();
    for (const r of rows) {
      const g = m.get(r.kategori) || { total: 0, items: [] };
      g.total += r.n; g.items.push(r);
      m.set(r.kategori, g);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [rows]);

  const max = Math.max(1, ...rows.map((r) => r.n));

  const gotoLov = (id: number) => {
    const p = new URLSearchParams(params);
    if (activeLov !== id) p.set("lov", String(id));
    router.push(`/laporan/dashboard?${p.toString()}`);
  };

  if (rows.length === 0) return <div className="text-sm text-mut">Tidak ada catatan pada periode ini.</div>;

  return (
    <div>
      <div className="flex justify-end gap-1 mb-2">
        {(["chart", "table"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setMode(k)}
            className={`btn btn-sm !px-2.5 ${mode === k ? "!bg-[#2B579A] !text-white !border-[#2B579A]" : ""}`}>
            {k === "chart" ? "Chart" : "Tabel"}
          </button>
        ))}
      </div>
      <div className="text-xs">
        {groups.map(([kat, g]) => (
          <div key={kat}>
            <button type="button" onClick={() => setClosed((c) => ({ ...c, [kat]: !c[kat] }))}
              className="w-full flex items-center gap-1.5 py-1.5 border-b border-line font-bold text-left hover:text-brand">
              <span className="text-[9px] w-3">{closed[kat] ? "▶" : "▼"}</span>
              <span className="flex-1">{kat}</span>
              <span className="tabular-nums">{g.total}</span>
            </button>
            {!closed[kat] ? g.items.map((r) => {
              const on = activeLov === r.lov_id;
              return (
                <button key={r.lov_id} type="button" onClick={() => gotoLov(r.lov_id)}
                  className={`w-full flex items-center gap-2 py-1 pl-5 pr-0.5 border-b border-line/60 text-left hover:bg-[#fafafa] ${on ? "bg-[#e8f0fe]" : ""}`}>
                  <span className={`flex-1 truncate ${on ? "font-bold text-[#2B579A]" : ""}`}>{r.teks}</span>
                  {mode === "chart" ? (
                    <span className="w-24 h-2.5 rounded-sm bg-line overflow-hidden shrink-0">
                      <span className="block h-full rounded-sm bg-[#404040]" style={{ width: `${Math.max(3, Math.round((r.n / max) * 100))}%` }} />
                    </span>
                  ) : null}
                  <span className="tabular-nums font-semibold w-10 text-right shrink-0">{r.n}</span>
                </button>
              );
            }) : null}
          </div>
        ))}
      </div>
      <div className="text-[11px] text-mut mt-1.5">Klik catatan untuk memfilter halaman (klik lagi untuk melepas).</div>
    </div>
  );
}
