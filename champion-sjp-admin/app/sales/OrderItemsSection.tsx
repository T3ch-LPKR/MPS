"use client";

import { useEffect, useRef, useState } from "react";

// Form input pembelian (muncul saat catatan berkategori "Order" dipilih).
// Item dicari dari master sjp_product (tanpa ketik kode). Per baris: Type ORDER/BONUS,
// Qty, Price (BONUS: 0 terkunci), Total = Qty x Price. Di bawah: diskon % / Rp + Grand Total.
// Item sama boleh 2x bila type beda; item sama + type sama ditolak.

export type OrderItem = { item_code: string; item_name: string; item_type: "ORDER" | "BONUS"; qty: number; price: number };
export type OrderData = { items: OrderItem[]; disc_type: "PCT" | "AMT" | null; disc_value: number | null; notes: string };

export const EMPTY_ORDER: OrderData = { items: [], disc_type: null, disc_value: null, notes: "" };

export function calcOrder(o: OrderData) {
  const subtotal = o.items.reduce((a, it) => a + (it.item_type === "ORDER" ? (it.qty || 0) * (it.price || 0) : 0), 0);
  const v = Number(o.disc_value) || 0;
  const disc = !o.disc_type || v <= 0 ? 0
    : o.disc_type === "PCT" ? Math.min(subtotal, (subtotal * Math.min(v, 100)) / 100)
    : Math.min(subtotal, v);
  return { subtotal, disc: Math.round(disc * 100) / 100, grand: Math.round((subtotal - disc) * 100) / 100 };
}

// valid: minimal 1 baris, semua qty > 0, baris ORDER wajib price > 0, minimal 1 baris ORDER
export function orderProblem(o: OrderData): string | null {
  if (o.items.length === 0) return "Isi item pembelian.";
  if (!o.items.some((it) => it.item_type === "ORDER")) return "Minimal satu baris bertipe Order.";
  if (o.items.some((it) => !(it.qty > 0))) return "Qty semua baris harus > 0.";
  if (o.items.some((it) => it.item_type === "ORDER" && !(it.price > 0))) return "Isi harga untuk semua baris Order.";
  return null;
}

type Product = { item_code: string; item_name: string; item_spec: string | null; unit: string | null };
const rp = (n: number) => n.toLocaleString("id");
// input angka ber-separator ribuan (1.000): tampil terformat, parse buang non-digit
const fmtN = (n: number | null | undefined) => (n ? Number(n).toLocaleString("id") : "");
const parseN = (s: string) => Number(String(s).replace(/\D/g, "")) || 0;
// jaga field tetap terlihat saat keyboard HP muncul
const keepVisible = (e: React.FocusEvent<HTMLInputElement>) => {
  const el = e.target;
  setTimeout(() => { try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {} }, 250);
};
// field angka: blok semua isi saat disentuh -> ketik langsung menimpa
const numFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  const el = e.target;
  try { el.select(); setTimeout(() => el.select(), 0); } catch {} // setTimeout: Safari iOS kadang batalkan select langsung
  keepVisible(e);
};

export default function OrderItemsSection({ value, onChange }: { value: OrderData; onChange: (v: OrderData) => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [dupMsg, setDupMsg] = useState("");
  // item duplikat yang menunggu keputusan: Batal / Tambah sebagai Bonus
  const [pendingDup, setPendingDup] = useState<Product | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (term.trim().length < 2) { setResults([]); setOpen(false); return; }
      try {
        const r = await fetch(`/api/products/search?q=${encodeURIComponent(term.trim())}`);
        setResults(await r.json().catch(() => []));
        setOpen(true);
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [term]);

  const set = (patch: Partial<OrderData>) => onChange({ ...value, ...patch });

  // nama snapshot menyertakan spec — pembeda penting (mis. bearing: nama sama, beda ukuran)
  const namaOf = (p: Product) => (p.item_spec ? `${p.item_name} ${p.item_spec}` : p.item_name);

  function addItem(p: Product) {
    setDupMsg(""); setPendingDup(null);
    const adaOrder = value.items.some((it) => it.item_code === p.item_code && it.item_type === "ORDER");
    const adaBonus = value.items.some((it) => it.item_code === p.item_code && it.item_type === "BONUS");
    if (adaOrder && adaBonus) {
      setDupMsg(`${p.item_name} sudah ada sebagai Order & Bonus — ubah Qty-nya saja.`);
    } else if (adaOrder) {
      setPendingDup(p); // tanya dulu: Batal / Tambah sebagai Bonus
    } else {
      set({ items: [...value.items, { item_code: p.item_code, item_name: namaOf(p), item_type: "ORDER", qty: 1, price: 0 }] });
    }
    setTerm(""); setResults([]); setOpen(false);
  }

  function addPendingAsBonus() {
    if (!pendingDup) return;
    const p = pendingDup;
    set({ items: [...value.items, { item_code: p.item_code, item_name: namaOf(p), item_type: "BONUS", qty: 1, price: 0 }] });
    setPendingDup(null);
  }

  function patchItem(i: number, patch: Partial<OrderItem>) {
    setDupMsg("");
    const next = value.items.map((it, j) => (j === i ? { ...it, ...patch } : it));
    const t = next[i];
    // tolak duplikat item+type sama (type di-switch)
    if (next.some((it, j) => j !== i && it.item_code === t.item_code && it.item_type === t.item_type)) {
      setDupMsg(`${t.item_name} dengan type ${t.item_type === "ORDER" ? "Order" : "Bonus"} sudah ada.`);
      return;
    }
    if (patch.item_type === "BONUS") t.price = 0; // bonus = gratis, harga terkunci
    set({ items: next });
  }

  const removeItem = (i: number) => set({ items: value.items.filter((_, j) => j !== i) });
  const { subtotal, disc, grand } = calcOrder(value);

  return (
    <div className="rounded-xl border border-line bg-white p-3 space-y-2">
      <div className="font-bold text-sm">🛒 Input Pembelian <span className="text-mut font-normal text-[11px]">(UOM: pcs)</span></div>

      {/* cari produk */}
      <div className="relative" ref={boxRef}>
        <input value={term} onChange={(e) => setTerm(e.target.value)} onFocus={keepVisible}
          className="inp !py-2.5 text-base" placeholder="Cari produk… (min. 2 huruf, nama / kode)" />
        {open && results.length > 0 ? (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-line rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {results.map((p) => (
              <button type="button" key={p.item_code} onClick={() => addItem(p)}
                className="w-full text-left px-3 py-2 hover:bg-[#f4f5f7] border-b border-line/60 last:border-0">
                <div className="text-sm font-semibold">{p.item_name}</div>
                <div className="text-[11px] text-mut font-mono">{p.item_code}{p.item_spec ? ` · ${p.item_spec}` : ""}</div>
              </button>
            ))}
          </div>
        ) : null}
        {open && term.trim().length >= 2 && results.length === 0 ? (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-line rounded-xl shadow px-3 py-2 text-xs text-mut">Tidak ketemu.</div>
        ) : null}
      </div>
      {dupMsg ? <div className="text-[11px] text-bad bg-[#fdeaea] rounded-lg px-3 py-1.5">{dupMsg}</div> : null}
      {pendingDup ? (
        <div className="rounded-lg border border-[#f0c36d] bg-[#fef8e7] px-3 py-2.5 space-y-2">
          <div className="text-xs"><b>{pendingDup.item_name}</b> sudah ada sebagai <b>Order</b>. Tambahkan lagi sebagai Bonus?</div>
          <div className="flex gap-2">
            <button type="button" onClick={addPendingAsBonus} className="btn btn-sm !bg-ok !text-white !border-ok">🎁 Tambah sebagai Bonus</button>
            <button type="button" onClick={() => setPendingDup(null)} className="btn btn-sm">Batal</button>
          </div>
        </div>
      ) : null}

      {/* baris item */}
      {value.items.length > 0 ? (
        <div className="space-y-2">
          {value.items.map((it, i) => {
            const total = (it.qty || 0) * (it.price || 0);
            const bonus = it.item_type === "BONUS";
            return (
              <div key={`${it.item_code}-${it.item_type}`} className="rounded-lg border border-line p-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{it.item_name}</div>
                    <div className="text-[11px] text-mut font-mono">{it.item_code}</div>
                  </div>
                  <button type="button" onClick={() => removeItem(i)} className="text-bad text-lg leading-none px-1" aria-label="Hapus">×</button>
                </div>
                {/* Type: tombol besar ramah jempol */}
                <div className="flex rounded-lg border border-line overflow-hidden text-sm font-semibold mt-2 w-fit">
                  {(["ORDER", "BONUS"] as const).map((t) => (
                    <button type="button" key={t} onClick={() => patchItem(i, { item_type: t })}
                      className={`px-4 py-2 ${it.item_type === t ? (t === "ORDER" ? "bg-brand text-white" : "bg-ok text-white") : "bg-white"}`}>
                      {t === "ORDER" ? "Order" : "Bonus"}
                    </button>
                  ))}
                </div>
                {/* Qty | Harga | Total: input tinggi, font 16px (tidak auto-zoom iOS), separator ribuan */}
                <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2 mt-2 items-end">
                  <div>
                    <div className="text-[11px] text-mut font-semibold mb-1">Qty (pcs)</div>
                    <input type="text" inputMode="numeric" value={fmtN(it.qty)} placeholder="0"
                      onFocus={numFocus}
                      onChange={(e) => patchItem(i, { qty: parseN(e.target.value) })}
                      className="inp !py-2.5 text-base text-center tabular-nums" />
                  </div>
                  <div>
                    <div className="text-[11px] text-mut font-semibold mb-1">Harga (Rp)</div>
                    <input type="text" inputMode="numeric" value={bonus ? "0" : fmtN(it.price)} placeholder="0"
                      readOnly={bonus} disabled={bonus} onFocus={numFocus}
                      onChange={(e) => patchItem(i, { price: parseN(e.target.value) })}
                      className={`inp !py-2.5 text-base text-right tabular-nums ${bonus ? "opacity-50" : ""}`} />
                  </div>
                  <div>
                    <div className="text-[11px] text-mut font-semibold mb-1 text-right">Total</div>
                    <div className="text-base text-right tabular-nums font-bold py-2.5">{bonus ? "GRATIS" : rp(total)}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* diskon + ringkasan */}
          <div className="rounded-lg bg-[#f4f5f7] p-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold flex-1">Diskon</span>
              <div className="flex rounded-lg border border-line overflow-hidden text-sm font-semibold bg-white">
                {([["PCT", "%"], ["AMT", "Rp"]] as const).map(([t, lbl]) => (
                  <button type="button" key={t}
                    onClick={() => set(value.disc_type === t ? { disc_type: null, disc_value: null } : { disc_type: t, disc_value: value.disc_value })}
                    className={`px-3.5 py-2 ${value.disc_type === t ? "bg-brand text-white" : ""}`}>{lbl}</button>
                ))}
              </div>
              <input type="text" inputMode="numeric" value={fmtN(value.disc_value)}
                disabled={!value.disc_type} onFocus={numFocus}
                onChange={(e) => set({ disc_value: e.target.value.trim() === "" ? null : parseN(e.target.value) })}
                className="inp !py-2.5 !w-28 text-base text-right tabular-nums disabled:opacity-40"
                placeholder={value.disc_type === "PCT" ? "%" : "Rp"} />
            </div>
            <div className="text-xs flex justify-between tabular-nums"><span>Subtotal</span><span>{rp(subtotal)}</span></div>
            {disc > 0 ? <div className="text-xs flex justify-between tabular-nums text-bad"><span>Diskon{value.disc_type === "PCT" ? ` ${value.disc_value}%` : ""}</span><span>−{rp(disc)}</span></div> : null}
            <div className="text-sm flex justify-between tabular-nums font-extrabold border-t border-line pt-1.5"><span>Grand Total</span><span>Rp {rp(grand)}</span></div>
          </div>

          <div>
            <label className="lbl">Catatan Order</label>
            <textarea value={value.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} className="inp"
              placeholder="mis. kirim minggu depan, bonus nota…" />
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-mut">Cari lalu ketuk produk untuk menambah baris. Pencarian butuh koneksi internet.</div>
      )}
    </div>
  );
}
