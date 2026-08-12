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

  const photoOk = photoMandatory ? !!photo : true;
  const canSubmit = !!pos && photoOk;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="lat" value={pos?.lat ?? ""} />
      <input type="hidden" name="lng" value={pos?.lng ?? ""} />
      <input type="hidden" name="accuracy" value={pos?.acc ?? ""} />
      <input type="hidden" name="photo" value={photo} />

      {/* GPS status */}
      <div className={`rounded-xl p-3 text-white ${pos ? "bg-ok" : "bg-bad"}`}>
        <div className="flex items-center gap-3">
          <div className="text-2xl">{pos ? "📍" : "⛔"}</div>
          <div className="flex-1">
            {!pos ? (
              <div className="font-bold text-sm">{gpsErr || "Mengambil lokasi…"}</div>
            ) : (
              <><div className="font-bold text-sm">Lokasi terkunci</div>
                <div className="text-[11px] opacity-90">akurasi ±{pos.acc} m</div></>
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
        <label className="lbl">Foto Selfie {photoMandatory ? <span className="text-brand">*</span> : <span className="text-mut font-normal">(opsional)</span>}</label>
        <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPhoto} />
        <button type="button" onClick={() => fileRef.current?.click()}
          className={`w-full rounded-xl border-2 border-dashed grid place-items-center h-44 overflow-hidden ${photo ? "border-ok" : "border-line bg-white"}`}>
          {photo ? <img src={photo} alt="selfie" className="w-full h-full object-cover" />
            : <div className="text-center text-mut"><div className="text-3xl">📷</div><div className="text-xs mt-1">Ketuk untuk selfie</div></div>}
        </button>
      </div>

      {state?.error ? <div className="text-sm text-bad bg-[#fdeaea] rounded-lg px-3 py-2">{state.error}</div> : null}
      {!canSubmit ? (
        <div className="text-[11px] text-mut text-center">
          Lengkapi: {[!pos ? "GPS" : null, (photoMandatory && !photo) ? "foto" : null].filter(Boolean).join(", ")}
        </div>
      ) : null}
      <SubmitBtn disabled={!canSubmit} mode={mode} />
    </form>
  );
}
