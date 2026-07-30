"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function RefreshButton() {
  const router = useRouter();
  const [spin, setSpin] = useState(false);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      title="Muat ulang"
      onClick={() => {
        setSpin(true);
        start(() => router.refresh());
        setTimeout(() => setSpin(false), 900);
      }}
      className="text-[11px] bg-white/20 rounded-full px-3 py-1 flex items-center gap-1"
    >
      <span className={spin ? "inline-block animate-spin" : "inline-block"}>↻</span> Refresh
    </button>
  );
}
