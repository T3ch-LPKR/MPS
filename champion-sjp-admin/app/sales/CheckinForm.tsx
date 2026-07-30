"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitCheckin } from "./actions";

type Lov = { lov_id: number; kode: string; teks: string };

function hav(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000, r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

function SubmitBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn btn-pri w-full justify-center py-3">
      {pending ? "Mengirim…" : "✔ Submit Kunjungan"}
    </button>
  );
}

export default function CheckinForm({
  schedId, custCode, custName, custLat, custLng, catatanLov, photoMandatory = true,
}: {
  schedId?: number | null; custCode: string; custName?: string;
  custLat?: number | null; custLng?: number | null; catatanLov: Lov[]; photoMandatory?: boolean;
}) {
  const [state, action] = useFormState(submitCheckin as any, {} as any);
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [gpsErr, setGpsErr] = useState("");
  const [photo, setPhoto] = useState<string>("");
  const [lov, setLov] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ambil lokasi
  useEffect(() => {
    if (!navigator.geolocation) { setGpsErr("Perangkat tak mendukung GPS."); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      (e) => setGpsErr(e.message || "Gagal ambil lokasi. Izinkan akses lokasi."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const hasCustGeo = custLat != null && custLng != null;
  const dist = pos && hasCustGeo ? hav(pos.lat, pos.lng, Number(custLat), Number(custLng)) : null;
  const inRadius = dist == null ? true : dist <= 50; // tanpa geo -> titik pertama (valid)
  const gpsReady = !!pos && inRadius;

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const max = 800, scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      cv.getContext("2d")!.drawImage(img, 0, 0, w, h);
      setPhoto(cv.toDataURL("image/jpeg", 0.6));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  const photoOk = photoMandatory ? !!photo : true;
  const canSubmit = gpsReady && photoOk && !!lov;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="sched_id" value={schedId ?? ""} />
      <input type="hidden" name="cust_code" value={custCode} />
      <input type="hidden" name="lat" value={pos?.lat ?? ""} />
      <input type="hidden" name="lng" value={pos?.lng ?? ""} />
      <input type="hidden" name="accuracy" value={pos?.acc ?? ""} />
      <input type="hidden" name="photo" value={photo} />
      <input type="hidden" name="catatan_lov_id" value={lov} />

      {/* GPS status */}
      <div className={`rounded-xl p-3 text-white ${gpsReady ? "bg-ok" : "bg-bad"}`}>
        <div className="flex items-center gap-3">
          <div className="text-2xl">{gpsReady ? "📍" : "⛔"}</div>
          <div className="flex-1">
            {!pos ? (
              <div className="font-bold text-sm">{gpsErr || "Mengambil lokasi…"}</div>
            ) : !hasCustGeo ? (
              <><div className="font-bold text-sm">Titik lokasi pertama</div>
                <div className="text-[11px] opacity-90">Customer belum punya titik. Lokasi ini akan jadi patokan.</div></>
            ) : inRadius ? (
              <><div className="font-bold text-sm">Dalam radius kunjungan</div>
                <div className="text-[11px] opacity-90">Jarak {dist} m (≤ 50 m) · akurasi ±{pos.acc} m</div></>
            ) : (
              <><div className="font-bold text-sm">Di luar radius (maks 50 m)</div>
                <div className="text-[11px] opacity-90">Jarak {dist} m · mendekat ke lokasi customer</div></>
            )}
          </div>
        </div>
      </div>

      {/* Selfie */}
      <div>
        <label className="lbl">Foto Selfie di Lokasi {photoMandatory ? <span className="text-brand">*</span> : <span className="text-mut font-normal">(opsional)</span>}</label>
        <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPhoto} />
        <button type="button" onClick={() => fileRef.current?.click()}
          className={`w-full rounded-xl border-2 border-dashed grid place-items-center h-44 overflow-hidden ${photo ? "border-ok" : "border-line bg-white"}`}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="selfie" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-mut"><div className="text-3xl">📷</div><div className="text-xs mt-1">Ketuk untuk ambil foto</div></div>
          )}
        </button>
      </div>

      {/* Catatan LOV */}
      <div>
        <label className="lbl">Catatan Kunjungan <span className="text-brand">*</span></label>
        <div className="flex flex-wrap gap-2">
          {catatanLov.map((l) => (
            <button type="button" key={l.lov_id} onClick={() => setLov(String(l.lov_id))}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${String(l.lov_id) === lov ? "bg-brand text-white border-brand" : "bg-white border-line"}`}>
              {l.teks}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="lbl">Catatan Tambahan</label>
        <textarea name="free_text" rows={2} className="inp" placeholder="mis. reorder Z9 5 dus, janji bayar AR…" />
      </div>

      {state?.error ? <div className="text-sm text-bad bg-[#fdeaea] rounded-lg px-3 py-2">{state.error}</div> : null}
      {!canSubmit ? (
        <div className="text-[11px] text-mut text-center">
          Lengkapi: {[!gpsReady ? "GPS" : null, (photoMandatory && !photo) ? "foto" : null, !lov ? "catatan" : null].filter(Boolean).join(", ")}
        </div>
      ) : null}
      <SubmitBtn disabled={!canSubmit} />
    </form>
  );
}
