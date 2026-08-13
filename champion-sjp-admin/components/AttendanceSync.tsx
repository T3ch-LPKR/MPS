"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { allItems, removeItem, countItems } from "@/lib/attendanceQueue";

// Kirim otomatis absen yang tersimpan offline: saat app dibuka + saat kembali online.
export default function AttendanceSync() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const busy = useRef(false);

  async function drain() {
    if (busy.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) { setCount(await countItems()); return; }
    const items = await allItems();
    setCount(items.length);
    if (!items.length) return;

    busy.current = true; setSyncing(true);
    let removed = 0;
    for (const it of items) {
      try {
        const r = await fetch("/api/attendance/submit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: it.mode, lat: it.lat, lng: it.lng, accuracy: it.accuracy, photo: it.photo, client_ts: it.client_ts }),
        });
        if (r.ok) { await removeItem(it.id); removed++; }
        else break; // ditolak server (mis. sesi habis) -> coba lagi nanti
      } catch { break; } // jaringan gagal -> berhenti, retry nanti
    }
    busy.current = false; setSyncing(false);
    setCount(await countItems());
    if (removed > 0) router.refresh(); // status absen ter-update
  }

  useEffect(() => {
    drain();
    const onOnline = () => drain();
    const onVis = () => { if (document.visibilityState === "visible") drain(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVis);
    const iv = setInterval(drain, 30000);
    return () => { window.removeEventListener("online", onOnline); document.removeEventListener("visibilitychange", onVis); clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (count <= 0) return null;
  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 bg-ink text-white text-[11px] px-3 py-1.5 rounded-full shadow-lg inline-flex items-center gap-1.5">
      {syncing ? (
        <><span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" /> Mengirim absen…</>
      ) : (
        <>⏳ {count} absen menunggu terkirim</>
      )}
    </div>
  );
}
