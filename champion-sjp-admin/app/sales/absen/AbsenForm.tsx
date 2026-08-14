"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enqueue } from "@/lib/offlineQueue";

export default function AbsenForm({ mode, photoMandatory }: { mode: "MASUK" | "PULANG"; photoMandatory: boolean }) {
  const router = useRouter();
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [gpsErr, setGpsErr] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photo, setPhoto] = useState("");
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
      setGpsErr(e.message || "Gagal ambil lokasi. Izinkan akses lokasi.");
      navigator.geolocation.getCurrentPosition(onOk, () => {}, { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 });
    };
    navigator.geolocation.getCurrentPosition(onOk, onErr, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
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

  const GPS_MAX_ACC = 150;
  const gpsOk = !!pos && pos.acc <= GPS_MAX_ACC;

  function refreshGps() {
    setGpsErr(""); setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }); setGpsLoading(false); },
      (e) => { setGpsErr(e.message || "Gagal ambil lokasi."); setGpsLoading(false); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  }
  const photoOk = photoMandatory ? !!photo : true;
  const canSubmit = gpsOk && photoOk && !submitting;

  async function doSubmit() {
    if (!gpsOk || !photoOk || submitting) return;
    setSubmitting(true); setMsg(null);
    const payload = { mode, lat: pos!.lat, lng: pos!.lng, accuracy: pos!.acc, photo, client_ts: new Date().toISOString() };

    // offline langsung -> simpan
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      try { await enqueue("absen", payload); } catch {}
      setMsg({ type: "offline", text: "Tersimpan offline — akan dikirim otomatis saat online." });
      setTimeout(() => { router.push("/sales/absen"); router.refresh(); }, 1400);
      return;
    }

    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch("/api/attendance/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), signal: ctrl.signal,
      });
      clearTimeout(to);
      if (r.ok) { router.push("/sales/absen"); router.refresh(); return; }
      const j = await r.json().catch(() => ({}));
      setMsg({ type: "err", text: j?.error || "Gagal menyimpan absen." });
      setSubmitting(false);
    } catch {
      clearTimeout(to);
      // jaringan gagal/timeout -> simpan offline
      try { await enqueue("absen", payload); } catch {}
      setMsg({ type: "offline", text: "Tersimpan offline — akan dikirim otomatis saat online." });
      setTimeout(() => { router.push("/sales/absen"); router.refresh(); }, 1400);
    }
  }

  return (
    <div className="space-y-3">
      {/* GPS status: mengunci -> akurat */}
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

      <button type="button" onClick={refreshGps} disabled={gpsLoading}
        className="text-xs text-brand underline inline-flex items-center gap-1.5 disabled:opacity-60">
        {gpsLoading ? (
          <><span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" /> Mengambil lokasi…</>
        ) : "🔄 Muat ulang GPS"}
      </button>

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

      {msg?.type === "err" ? <div className="text-sm text-bad bg-[#fdeaea] rounded-lg px-3 py-2">{msg.text}</div> : null}
      {msg?.type === "offline" ? <div className="text-sm text-[#1e40af] bg-[#e8f0fe] rounded-lg px-3 py-2">📴 {msg.text}</div> : null}

      {pos && !gpsOk ? (
        <div className="text-[11px] text-[#b45309] bg-[#fef4e2] rounded-lg px-3 py-2">
          GPS masih ±{pos.acc} m. Setel izin lokasi ke <b>Tepat/Precise</b>: Chrome ⋮ → (ikon gembok/info situs) → <b>Izin/Location</b> → pilih <b>Precise/Tepat</b>. Lalu dekat jendela/outdoor & tunggu ≤{GPS_MAX_ACC} m. Belum bisa absen.
        </div>
      ) : null}
      {(!gpsOk && !pos) || (photoMandatory && !photo) ? (
        <div className="text-[11px] text-mut text-center">
          Lengkapi: {[!pos ? "GPS" : null, (photoMandatory && !photo) ? "foto" : null].filter(Boolean).join(", ")}
        </div>
      ) : null}

      <button type="button" onClick={doSubmit} disabled={!canSubmit}
        className={`btn w-full justify-center py-3 ${mode === "MASUK" ? "btn-pri" : "bg-ink text-white border-ink"}`}>
        {submitting ? "Mengirim…" : mode === "MASUK" ? "✔ Absen Masuk" : "✔ Absen Pulang"}
      </button>
    </div>
  );
}
