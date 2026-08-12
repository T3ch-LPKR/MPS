"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitCheckin } from "./actions";
import { haversineMeters, GEOFENCE_M } from "@/lib/geo";

type Lov = { lov_id: number; kode: string; teks: string };

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
      (p) => {
        const cand = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) };
        setPos((prev) => (!prev || cand.acc <= prev.acc ? cand : prev)); // simpan yang paling akurat
      },
      (e) => setGpsErr(e.message || "Gagal ambil lokasi. Izinkan akses lokasi."),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const hasCustGeo = custLat != null && custLng != null;
  const dist = pos && hasCustGeo ? haversineMeters(pos.lat, pos.lng, Number(custLat), Number(custLng)) : null;
  const inRadius = dist == null ? true : dist <= GEOFENCE_M; // tanpa geo -> titik pertama
  // Non-blocking: cukup ada posisi GPS. Di luar radius tetap boleh submit (masuk approval admin).
  const gpsReady = !!pos;

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

      {/* GPS status (non-blocking: di luar radius = kuning, tetap bisa submit) */}
      <div className={`rounded-xl p-3 text-white ${!pos ? "bg-bad" : (!hasCustGeo || inRadius) ? "bg-ok" : "bg-warn"}`}>
        <div className="flex items-center gap-3">
          <div className="text-2xl">{!pos ? "⛔" : (!hasCustGeo || inRadius) ? "📍" : "⚠️"}</div>
          <div className="flex-1">
            {!pos ? (
              <div className="font-bold text-sm">{gpsErr || "Mengambil lokasi…"}</div>
            ) : !hasCustGeo ? (
              <><div className="font-bold text-sm">Titik lokasi pertama</div>
                <div className="text-[11px] opacity-90">Customer belum punya titik. Lokasi ini akan jadi patokan.</div></>
            ) : inRadius ? (
              <><div className="font-bold text-sm">Dalam radius kunjungan</div>
                <div className="text-[11px] opacity-90">Jarak {dist} m (≤ {GEOFENCE_M} m) · akurasi ±{pos.acc} m</div></>
            ) : (
              <><div className="font-bold text-sm">Di luar radius {GEOFENCE_M} m (jarak {dist} m)</div>
                <div className="text-[11px] opacity-90">Kunjungan tetap tercatat. Lokasi baru dikirim ke Admin untuk verifikasi.</div></>
            )}
          </div>
        </div>
      </div>

      {pos && pos.acc > 75 ? (
        <div className="text-[11px] text-[#b45309] bg-[#fef4e2] rounded-lg px-3 py-2">
          ⚠️ Sinyal GPS lemah (±{pos.acc} m). Pakai HP (bukan laptop), aktifkan GPS/Lokasi, keluar ke area terbuka, tunggu beberapa detik hingga akurat.
        </div>
      ) : null}

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
