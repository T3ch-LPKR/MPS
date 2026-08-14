"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { allItems, removeItem, countItems, type QStore } from "@/lib/offlineQueue";

const ENDPOINT: Record<QStore, string> = {
  absen: "/api/attendance/submit",
  visit: "/api/visit/submit",
};

// Kirim otomatis antrean offline (absen + kunjungan) saat app dibuka / kembali online.
export default function OfflineSync() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const busy = useRef(false);

  async function drainStore(store: QStore): Promise<number> {
    const items = await allItems(store);
    let removed = 0;
    for (const it of items) {
      try {
        const r = await fetch(ENDPOINT[store], {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(it),
        });
        if (r.ok) { await removeItem(store, it.id); removed++; }
        else break; // ditolak server (mis. sesi habis) -> retry nanti
      } catch { break; } // jaringan gagal -> berhenti
    }
    return removed;
  }

  async function drain() {
    if (busy.current) return;
    const total0 = (await countItems("absen")) + (await countItems("visit"));
    setCount(total0);
    if (total0 === 0) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    busy.current = true; setSyncing(true);
    const removed = (await drainStore("absen")) + (await drainStore("visit"));
    busy.current = false; setSyncing(false);
    setCount((await countItems("absen")) + (await countItems("visit")));
    if (removed > 0) router.refresh();
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
        <><span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" /> Mengirim data offline…</>
      ) : (
        <>⏳ {count} data menunggu terkirim</>
      )}
    </div>
  );
}
