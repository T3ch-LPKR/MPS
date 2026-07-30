"use client";

import { useEffect, useRef, useState } from "react";

type Cust = { cust_code: string; cust_name: string; area: string };

export default function CustomerSearch({ initialCode, initialName }: { initialCode?: string; initialName?: string }) {
  const initSel = initialCode ? { cust_code: initialCode, cust_name: initialName || initialCode, area: "" } : null;
  const [term, setTerm] = useState(initSel ? `${initSel.cust_name} (${initSel.cust_code})` : "");
  const [results, setResults] = useState<Cust[]>([]);
  const [sel, setSel] = useState<Cust | null>(initSel);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // debounce fetch
  useEffect(() => {
    if (sel) return;
    const t = setTimeout(async () => {
      const query = term.trim();
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const r = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
        const d = await r.json();
        setResults(Array.isArray(d) ? d : []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [term, sel]);

  // klik luar → tutup
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function choose(c: Cust) {
    setSel(c);
    setTerm(`${c.cust_name} (${c.cust_code})`);
    setOpen(false);
  }
  function reset() {
    setSel(null);
    setTerm("");
    setResults([]);
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="lbl">Customer</label>
      <div className="flex gap-2">
        <input
          className="inp"
          value={term}
          placeholder="Ketik nama customer… mis. BERLIAN"
          onChange={(e) => {
            setTerm(e.target.value);
            if (sel) setSel(null);
          }}
          onFocus={() => results.length && setOpen(true)}
          autoComplete="off"
        />
        {sel ? (
          <button type="button" onClick={reset} className="btn btn-sm" title="Ganti">✕</button>
        ) : null}
      </div>

      {/* nilai yang benar-benar dikirim ke server */}
      <input type="hidden" name="cust_code" value={sel?.cust_code || ""} />

      {open && !sel ? (
        <div className="absolute z-20 mt-1 w-full bg-white border border-line rounded-lg shadow-lg max-h-64 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-mut">Mencari…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-mut">
              {term.trim().length < 2 ? "Ketik minimal 2 huruf" : "Tidak ada hasil"}
            </div>
          ) : (
            results.map((c) => (
              <button
                type="button"
                key={c.cust_code}
                onClick={() => choose(c)}
                className="w-full text-left px-3 py-2 hover:bg-brand-soft border-b border-line last:border-0"
              >
                <div className="font-semibold text-sm">{c.cust_name}</div>
                <div className="text-[11px] text-mut">{c.cust_code} · {c.area || "-"}</div>
              </button>
            ))
          )}
        </div>
      ) : null}

      {sel ? (
        <div className="text-[11px] text-ok mt-1">✓ {sel.cust_name} terpilih</div>
      ) : null}
    </div>
  );
}
