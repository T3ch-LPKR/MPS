"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitAbsen } from "./actions";

function SubmitBtn({ disabled, mode }: { disabled: boolean; mode: "MASUK" | "PULANG" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending}
      className={`btn w-full justify-center py-3 ${mode === "MASUK" ? "btn-pri" : "bg-ink text-white border-ink"}`}>
      {pending ? "Mengirim…" : mode === "MASUK" ? "✔ Absen Masuk" : "✔ Absen Pulang"}
    </button>
  );
}

export default function AbsenForm({ mode, photoMandatory }: { mode: "MASUK" | "PULANG"; photoMandatory: boolean }) {
  const [state, action] = useFormState(submitAbsen as any, {} as any);
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [gpsErr, setGpsErr] = useState("");
  const [photo, setPhoto] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsErr("Perangkat tak mendukung GPS."); return; }
    const onOk = (p: GeolocationPosition) => {
      const cand = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) };
      setPos((prev) => (!prev || cand.acc <= prev.acc ? cand : prev)); // simpan yang paling akurat
      setGpsErr("");
    };
    const onErr = (e: GeolocationPositionError) => {
      setGpsErr(e.message || "Gagal ambil lokasi. Izinkan akses lokasi.");
      // fallback jaringan (last resort) supaya tak stuck
      navigator.geolocation.getCurrentPosition(onOk, () => {}, { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 });
    };
    // 1) pakai ulang fix akurat terbaru (mis. sisa Google Maps) -> cepat & akurat
    navigator.geolocation.getCurrentPosition(onOk, onErr, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    // 2) terus perbaiki di background
    const id = navigator.geolocation.watchPosition(onOk, onErr, { enableHighAccuracy: true, timeout: 30000, maximumAge: 30000 });
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
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

  const GPS_MAX_ACC = 150; // tolak titik kasar (mis. izin "Approximate"/jaringan ±ribuan meter)
  const gpsOk = !!pos && pos.acc <= GPS_MAX_ACC;

  function refreshGps() {
    setGpsErr("");
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      (e) => setGpsErr(e.message || "Gagal ambil lokasi."),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  }
  const photoOk = photoMandatory ? !!photo : true;
  const canSubmit = gpsOk && photoOk;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="lat" value={pos?.lat ?? ""} />
      <input type="hidden" name="lng" value={pos?.lng ?? ""} />
      <input type="hidden" name="accuracy" value={pos?.acc ?? ""} />
      <input type="hidden" name="photo" value={photo} />

      {/* GPS status: mengunci -> akurat (biarkan halaman terbuka, membaik sendiri) */}
      {(() => {
        const locking = !!pos && pos.acc > 50;
        const bg = !pos ? "bg-bad" : locking ? "bg-warn" : "bg-ok";
        const icon = !pos ? "⛔" : locking ? "🛰️" : "📍";
        return (
          <div className={`rounded-xl p-3 text-white ${bg}`}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">{icon}</div>
              <div className="flex-1">
                {!pos ? (
                  <div className="font-bold text-sm">{gpsErr || "Mengambil lokasi…"}</div>
                ) : locking ? (
                  <><div className="font-bold text-sm">Mengunci GPS… ±{pos.acc} m</div>
                    <div className="text-[11px] opacity-90">Tunggu beberapa detik (sambil ambil selfie) — akurasi membaik sendiri.</div></>
                ) : (
                  <><div className="font-bold text-sm">Lokasi akurat ±{pos.acc} m</div>
                    <div className="text-[11px] opacity-90">Siap absen.</div></>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <button type="button" onClick={refreshGps} className="text-xs text-brand underline">🔄 Muat ulang GPS</button>

      {/* Selfie */}
      <div>
        <label className="lbl">Foto Selfie {photoMandatory ? <span className="text-brand">*</span> : <span className="text-mut font-normal">(opsional)</span>}</label>
        <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPhoto} />
        <button type="button" onClick={() => fileRef.current?.click()}
          className={`w-full rounded-xl border-2 border-dashed grid place-items-center min-h-[11rem] p-1 overflow-hidden ${photo ? "border-ok bg-[#f2f2f2]" : "border-line bg-white"}`}>
          {photo ? <img src={photo} alt="selfie" className="w-full max-h-96 object-contain rounded-lg" />
            : <div className="text-center text-mut py-10"><div className="text-3xl">📷</div><div className="text-xs mt-1">Ketuk untuk selfie</div></div>}
        </button>
      </div>

      {state?.error ? <div className="text-sm text-bad bg-[#fdeaea] rounded-lg px-3 py-2">{state.error}</div> : null}
      {pos && !gpsOk ? (
        <div className="text-[11px] text-[#b45309] bg-[#fef4e2] rounded-lg px-3 py-2">
          GPS masih ±{pos.acc} m (dari jaringan, belum satelit). Tunggu hingga akurat ≤{GPS_MAX_ACC} m — dekat jendela / luar ruangan, GPS/High-accuracy ON. Belum bisa absen.
        </div>
      ) : null}
      {!canSubmit && (!pos || (photoMandatory && !photo)) ? (
        <div className="text-[11px] text-mut text-center">
          Lengkapi: {[!pos ? "GPS" : null, (photoMandatory && !photo) ? "foto" : null].filter(Boolean).join(", ")}
        </div>
      ) : null}
      <SubmitBtn disabled={!canSubmit} mode={mode} />
    </form>
  );
}
