"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitCheckin } from "./actions";

type Lov = { lov_id: number; kode: string; teks: string };
type Cust = { cust_code: string; cust_name: string; area: string };

function SubmitBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} className="btn btn-pri w-full justify-center py-3">{pending ? "Mengirim…" : "✔ Submit Kunjungan OOS"}</button>;
}

export default function OOSForm({ catatanLov, oosLov, photoMandatory = true }: { catatanLov: Lov[]; oosLov: Lov[]; photoMandatory?: boolean }) {
  const [state, action] = useFormState(submitCheckin as any, {} as any);
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [gpsErr, setGpsErr] = useState("");
  const [photo, setPhoto] = useState("");
  const [lov, setLov] = useState("");
  const [oos, setOos] = useState("");
  const [isNew, setIsNew] = useState(false);
  // existing customer search
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Cust[]>([]);
  const [sel, setSel] = useState<Cust | null>(null);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsErr("Perangkat tak mendukung GPS."); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      (e) => setGpsErr(e.message || "Izinkan akses lokasi."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
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

  const custOk = isNew ? true /* nama divalidasi via required */ : !!sel;
  const photoOk = photoMandatory ? !!photo : true;
  const canSubmit = !!pos && custOk && photoOk && !!lov && !!oos;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="is_oos" value="1" />
      <input type="hidden" name="oos_lov_id" value={oos} />
      <input type="hidden" name="catatan_lov_id" value={lov} />
      <input type="hidden" name="cust_code" value={!isNew && sel ? sel.cust_code : ""} />
      <input type="hidden" name="lat" value={pos?.lat ?? ""} />
      <input type="hidden" name="lng" value={pos?.lng ?? ""} />
      <input type="hidden" name="accuracy" value={pos?.acc ?? ""} />
      <input type="hidden" name="photo" value={photo} />

      {/* Alasan OOS */}
      <div>
        <label className="lbl">Alasan Luar Jadwal <span className="text-brand">*</span></label>
        <div className="flex flex-wrap gap-2">
          {oosLov.map((l) => (
            <button type="button" key={l.lov_id} onClick={() => setOos(String(l.lov_id))}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${String(l.lov_id) === oos ? "bg-info text-white border-info" : "bg-white border-line"}`}>{l.teks}</button>
          ))}
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
            <input name="prospek_nama" className="inp" placeholder="Nama usaha/toko *" required={isNew} />
            <input name="prospek_alamat" className="inp" placeholder="Alamat" />
            <input name="prospek_pic" className="inp" placeholder="Nama PIC" />
            <input name="prospek_hp" className="inp" placeholder="No. HP" />
            <div className="text-[11px] text-mut">Prospek disimpan lokal (bukan master). Titik GPS check-in jadi lokasinya.</div>
          </div>
        )}
      </div>

      {/* GPS */}
      <div className={`rounded-xl p-3 text-white ${pos ? "bg-ok" : "bg-bad"}`}>
        <div className="text-sm font-bold">{pos ? "Lokasi terbaca" : (gpsErr || "Mengambil lokasi…")}</div>
        {pos ? <div className="text-[11px] opacity-90">akurasi ±{pos.acc} m · titik ini jadi lokasi kunjungan</div> : null}
      </div>

      {/* Foto */}
      <div>
        <label className="lbl">Foto Selfie {photoMandatory ? <span className="text-brand">*</span> : <span className="text-mut font-normal">(opsional)</span>}</label>
        <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPhoto} />
        <button type="button" onClick={() => fileRef.current?.click()} className={`w-full rounded-xl border-2 border-dashed grid place-items-center h-40 overflow-hidden ${photo ? "border-ok" : "border-line bg-white"}`}>
          {photo ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={photo} alt="" className="w-full h-full object-cover" />) : <div className="text-center text-mut"><div className="text-3xl">📷</div><div className="text-xs">Ambil foto</div></div>}
        </button>
      </div>

      {/* Catatan */}
      <div>
        <label className="lbl">Catatan Kunjungan <span className="text-brand">*</span></label>
        <div className="flex flex-wrap gap-2">
          {catatanLov.map((l) => (
            <button type="button" key={l.lov_id} onClick={() => setLov(String(l.lov_id))} className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${String(l.lov_id) === lov ? "bg-brand text-white border-brand" : "bg-white border-line"}`}>{l.teks}</button>
          ))}
        </div>
      </div>
      <textarea name="free_text" rows={2} className="inp" placeholder="Catatan tambahan…" />

      {state?.error ? <div className="text-sm text-bad bg-[#fdeaea] rounded-lg px-3 py-2">{state.error}</div> : null}
      <SubmitBtn disabled={!canSubmit} />
    </form>
  );
}
