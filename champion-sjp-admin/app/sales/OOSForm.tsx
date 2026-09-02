"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enqueue } from "@/lib/offlineQueue";

type Lov = { lov_id: number; kode: string; teks: string };
type Cust = { cust_code: string; cust_name: string; area: string };

function uid() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
}

export default function OOSForm({ catatanLov, oosLov, photoMandatory = true }: { catatanLov: Lov[]; oosLov: Lov[]; photoMandatory?: boolean }) {
  const router = useRouter();
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [gpsErr, setGpsErr] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photo, setPhoto] = useState("");
  const [lovIds, setLovIds] = useState<string[]>([]);
  const [oosIds, setOosIds] = useState<string[]>([]);
  const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
    set((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  const toggleLov = toggle(setLovIds);
  const toggleOos = toggle(setOosIds);
  const [freeText, setFreeText] = useState("");
  const [arCollect, setArCollect] = useState<"" | "FULL" | "PARTIAL">("");
  const [arAmount, setArAmount] = useState("");
  const [isNew, setIsNew] = useState(false);
  // prospek baru
  const [pNama, setPNama] = useState(""); const [pAlamat, setPAlamat] = useState("");
  const [pPic, setPPic] = useState(""); const [pHp, setPHp] = useState("");
  // existing customer search
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Cust[]>([]);
  const [sel, setSel] = useState<Cust | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "err" | "offline"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsErr("Perangkat tak mendukung GPS."); return; }
    const onOk = (p: GeolocationPosition) => {
      const cand = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) };
      setPos((prev) => (!prev || cand.acc <= prev.acc ? cand : prev));
      setGpsErr("");
    };
    const onErr = (e: GeolocationPositionError) => {
      setGpsErr(e.message || "Izinkan akses lokasi.");
      navigator.geolocation.getCurrentPosition(onOk, () => {}, { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 });
    };
    navigator.geolocation.getCurrentPosition(onOk, onErr, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    const id = navigator.geolocation.watchPosition(onOk, onErr, { enableHighAccuracy: true, timeout: 30000, maximumAge: 30000 });
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    if (sel || isNew) return;
    const t = setTimeout(async () => {
      if (term.trim().length < 2) { setResults([]); return; }
      const r = await fetch(`/api/customers/search?q=${encodeURIComponent(term.trim())}`);
      setResults(await r.json().catch(() => [])); setOpen(true);
    }, 250);
    return () => clearTimeout(t);
  }, [term, sel, isNew]);

  const GPS_MAX_ACC = 150;
  const gpsReady = !!pos && pos.acc <= GPS_MAX_ACC;

  function refreshGps() {
    setGpsErr(""); setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }); setGpsLoading(false); },
      (e) => { setGpsErr(e.message || "Gagal ambil lokasi."); setGpsLoading(false); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const max = 800, sc = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      cv.getContext("2d")!.drawImage(img, 0, 0, w, h);
      setPhoto(cv.toDataURL("image/jpeg", 0.6)); URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  const custOk = isNew ? !!pNama.trim() : !!sel;
  const photoOk = photoMandatory ? !!photo : true;
  const canCollectAr = !isNew && !!sel; // hanya customer terdaftar yang punya AR
  const arPartialOk = arCollect !== "PARTIAL" || Number(arAmount) > 0;
  const canSubmit = gpsReady && custOk && photoOk && lovIds.length > 0 && oosIds.length > 0 && arPartialOk && !submitting;

  async function doSubmit() {
    if (!canSubmit) return;
    setSubmitting(true); setMsg(null);
    const payload = {
      client_uid: uid(), client_ts: new Date().toISOString(),
      is_oos: true, oos_lov_ids: oosIds, catatan_lov_ids: lovIds, free_text: freeText || null,
      ar_collect: canCollectAr && arCollect ? arCollect : null,
      ar_amount: canCollectAr && arCollect === "PARTIAL" ? Number(arAmount) : null,
      cust_code: !isNew && sel ? sel.cust_code : null,
      prospek_nama: isNew ? pNama.trim() : "", prospek_alamat: pAlamat, prospek_pic: pPic, prospek_hp: pHp,
      lat: pos!.lat, lng: pos!.lng, accuracy: pos!.acc, photo,
    };
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      try { await enqueue("visit", payload); } catch {}
      setMsg({ type: "offline", text: "Tersimpan offline — akan dikirim otomatis saat online." });
      setTimeout(() => { router.push("/sales"); router.refresh(); }, 1400);
      return;
    }
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch("/api/visit/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), signal: ctrl.signal,
      });
      clearTimeout(to);
      if (r.ok) { router.push("/sales/sukses"); return; }
      const j = await r.json().catch(() => ({}));
      setMsg({ type: "err", text: j?.error || "Gagal menyimpan kunjungan." });
      setSubmitting(false);
    } catch {
      clearTimeout(to);
      try { await enqueue("visit", payload); } catch {}
      setMsg({ type: "offline", text: "Tersimpan offline — akan dikirim otomatis saat online." });
      setTimeout(() => { router.push("/sales"); router.refresh(); }, 1400);
    }
  }

  return (
    <div className="space-y-3">
      {/* Alasan OOS */}
      <div>
        <label className="lbl">Alasan Luar Jadwal <span className="text-brand">*</span> <span className="text-mut font-normal text-[11px]">(bisa pilih &gt;1)</span></label>
        <div className="flex flex-wrap gap-2">
          {oosLov.map((l) => {
            const on = oosIds.includes(String(l.lov_id));
            return (
              <button type="button" key={l.lov_id} onClick={() => toggleOos(String(l.lov_id))}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${on ? "bg-info text-white border-info" : "bg-white border-line"}`}>{on ? "✓ " : ""}{l.teks}</button>
            );
          })}
        </div>
      </div>

      {/* Customer: existing / baru */}
      <div>
        <label className="lbl">Customer <span className="text-brand">*</span></label>
        <div className="flex gap-2 mb-2 text-xs">
          <button type="button" onClick={() => setIsNew(false)} className={`px-3 py-1 rounded-full border ${!isNew ? "bg-brand text-white border-brand" : "bg-white border-line"}`}>Terdaftar</button>
          <button type="button" onClick={() => { setIsNew(true); setSel(null); }} className={`px-3 py-1 rounded-full border ${isNew ? "bg-brand text-white border-brand" : "bg-white border-line"}`}>Baru (prospek)</button>
        </div>
        {!isNew ? (
          <div className="relative">
            <input className="inp" placeholder="Ketik nama customer…" value={sel ? `${sel.cust_name} (${sel.cust_code})` : term}
              onChange={(e) => { setTerm(e.target.value); setSel(null); }} onFocus={() => results.length && setOpen(true)} />
            {open && !sel ? (
              <div className="absolute z-20 w-full bg-white border border-line rounded-lg shadow mt-1 max-h-56 overflow-auto">
                {results.length === 0 ? <div className="px-3 py-2 text-xs text-mut">Ketik ≥2 huruf</div> :
                  results.map((c) => (
                    <button type="button" key={c.cust_code} onClick={() => { setSel(c); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-brand-soft border-b border-line last:border-0">
                      <div className="text-sm font-semibold">{c.cust_name}</div><div className="text-[11px] text-mut">{c.cust_code} · {c.area || "-"}</div>
                    </button>
                  ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <input value={pNama} onChange={(e) => setPNama(e.target.value)} className="inp" placeholder="Nama usaha/toko *" />
            <input value={pAlamat} onChange={(e) => setPAlamat(e.target.value)} className="inp" placeholder="Alamat" />
            <input value={pPic} onChange={(e) => setPPic(e.target.value)} className="inp" placeholder="Nama PIC" />
            <input value={pHp} onChange={(e) => setPHp(e.target.value)} className="inp" placeholder="No. HP" />
            <div className="text-[11px] text-mut">Prospek disimpan lokal (bukan master). Titik GPS check-in jadi lokasinya.</div>
          </div>
        )}
      </div>

      {/* GPS: mengunci -> akurat */}
      {(() => {
        const locking = !!pos && pos.acc > 50;
        const bg = !pos ? "bg-bad" : locking ? "bg-warn" : "bg-ok";
        const icon = !pos ? "⛔" : locking ? "🛰️" : "📍";
        return (
          <div className={`rounded-xl p-3 text-white ${bg}`}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">{icon}</div>
              <div className="flex-1">
                {!pos ? <div className="font-bold text-sm">{gpsErr || "Mengambil lokasi…"}</div>
                  : locking ? <><div className="font-bold text-sm">Mengunci GPS… ±{pos.acc} m</div><div className="text-[11px] opacity-90">Tunggu beberapa detik — akurasi membaik sendiri.</div></>
                  : <><div className="font-bold text-sm">Lokasi akurat ±{pos.acc} m</div><div className="text-[11px] opacity-90">Titik ini jadi lokasi kunjungan.</div></>}
              </div>
            </div>
          </div>
        );
      })()}

      <button type="button" onClick={refreshGps} disabled={gpsLoading}
        className="text-xs text-brand underline inline-flex items-center gap-1.5 disabled:opacity-60">
        {gpsLoading ? (<><span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" /> Mengambil lokasi…</>) : "🔄 Muat ulang GPS"}
      </button>
      {pos && !gpsReady ? (
        <div className="text-[11px] text-[#b45309] bg-[#fef4e2] rounded-lg px-3 py-2">
          GPS masih ±{pos.acc} m. Setel izin lokasi ke <b>Tepat/Precise</b> (Chrome ⋮ → info situs → Location). Dekat jendela/outdoor & tunggu ≤{GPS_MAX_ACC} m. Belum bisa check-in.
        </div>
      ) : null}

      {/* Foto */}
      <div>
        <label className="lbl">Foto Selfie {photoMandatory ? <span className="text-brand">*</span> : <span className="text-mut font-normal">(opsional)</span>}</label>
        <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPhoto} />
        <button type="button" onClick={() => fileRef.current?.click()} className={`w-full rounded-xl border-2 border-dashed grid place-items-center min-h-[11rem] p-1 overflow-hidden ${photo ? "border-ok bg-[#f2f2f2]" : "border-line bg-white"}`}>
          {photo ? <img src={photo} alt="" className="w-full max-h-96 object-contain rounded-lg" /> : <div className="text-center text-mut py-10"><div className="text-3xl">📷</div><div className="text-xs">Ambil foto</div></div>}
        </button>
      </div>

      {/* Catatan */}
      <div>
        <label className="lbl">Catatan Kunjungan <span className="text-brand">*</span> <span className="text-mut font-normal text-[11px]">(bisa pilih &gt;1)</span></label>
        <div className="flex flex-wrap gap-2">
          {catatanLov.map((l) => {
            const on = lovIds.includes(String(l.lov_id));
            return (
              <button type="button" key={l.lov_id} onClick={() => toggleLov(String(l.lov_id))} className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${on ? "bg-brand text-white border-brand" : "bg-white border-line"}`}>{on ? "✓ " : ""}{l.teks}</button>
            );
          })}
        </div>
      </div>
      {/* Penagihan AR (opsional) — customer terdaftar */}
      {canCollectAr ? (
        <div>
          <label className="lbl">Penagihan AR <span className="text-mut font-normal text-[11px]">(opsional)</span></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setArCollect((v) => (v === "FULL" ? "" : "FULL")); setArAmount(""); }}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${arCollect === "FULL" ? "bg-ok text-white border-ok" : "bg-white border-line"}`}>
              {arCollect === "FULL" ? "✓ " : ""}Lunas (Full)
            </button>
            <button type="button" onClick={() => setArCollect((v) => (v === "PARTIAL" ? "" : "PARTIAL"))}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${arCollect === "PARTIAL" ? "bg-warn text-white border-warn" : "bg-white border-line"}`}>
              {arCollect === "PARTIAL" ? "✓ " : ""}Bayar Sebagian
            </button>
          </div>
          {arCollect === "FULL" ? <div className="text-[11px] text-ok mt-1">Tercatat lunas sesuai outstanding customer.</div> : null}
          {arCollect === "PARTIAL" ? (
            <input type="number" inputMode="numeric" min={1} value={arAmount} onChange={(e) => setArAmount(e.target.value)}
              className="inp mt-2" placeholder="Nominal dibayar (Rp)" />
          ) : null}
        </div>
      ) : null}

      <textarea value={freeText} onChange={(e) => setFreeText(e.target.value)} rows={2} className="inp" placeholder="Catatan tambahan…" />

      {msg?.type === "err" ? <div className="text-sm text-bad bg-[#fdeaea] rounded-lg px-3 py-2">{msg.text}</div> : null}
      {msg?.type === "offline" ? <div className="text-sm text-[#1e40af] bg-[#e8f0fe] rounded-lg px-3 py-2">📴 {msg.text}</div> : null}

      <button type="button" onClick={doSubmit} disabled={!canSubmit} className="btn btn-pri w-full justify-center py-3">
        {submitting ? "Mengirim…" : "✔ Submit Kunjungan OOS"}
      </button>
    </div>
  );
}
