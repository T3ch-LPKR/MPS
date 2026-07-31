"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Idle auto-logout untuk Admin & HOS.
 * - Aktivitas (mouse/keyboard/scroll/touch) memperpanjang sesi via heartbeat (throttle).
 * - Idle `idleMinutes` menit tanpa aktivitas → paksa ke /login (cookie sesi juga sudah expired di server).
 */
export default function SessionKeeper({ idleMinutes = 60 }: { idleMinutes?: number }) {
  const router = useRouter();
  const lastBeat = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const idleMs = idleMinutes * 60 * 1000;
    const beatEveryMs = 2 * 60 * 1000; // heartbeat maksimal tiap 2 menit

    const logout = () => { window.location.href = "/login"; };

    const resetIdle = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(logout, idleMs);
    };

    const beat = () => {
      const now = Date.now();
      if (now - lastBeat.current < beatEveryMs) return;
      lastBeat.current = now;
      fetch("/api/session/heartbeat", { method: "POST", cache: "no-store" })
        .then((r) => { if (r.status === 401) logout(); })
        .catch(() => {});
    };

    const onActivity = () => { resetIdle(); beat(); };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    resetIdle();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [idleMinutes, router]);

  return null;
}
