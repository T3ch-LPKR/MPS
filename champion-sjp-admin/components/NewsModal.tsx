"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

type News = { news_id: number; title: string; body: string | null; has_photo: boolean };

// Popup berita saat buka app. Tampil 1-per-1; "Mengerti"/"Berikutnya" -> tandai dibaca.
export default function NewsModal({ items }: { items: News[] }) {
  const [idx, setIdx] = useState(0);
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (closed || items.length === 0 || idx >= items.length) return null;
  const n = items[idx];
  const last = idx + 1 >= items.length;

  async function next() {
    setBusy(true);
    try {
      await fetch("/api/news/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news_id: n.news_id }),
      });
    } catch { /* biar tetap lanjut walau gagal tandai */ }
    setBusy(false);
    if (last) setClosed(true); else setIdx(idx + 1);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[420px] max-h-[85vh] overflow-auto shadow-xl">
        {n.has_photo ? (
          <img src={`/api/news-photo/${n.news_id}`} alt="" className="w-full max-h-56 object-cover rounded-t-2xl" />
        ) : null}
        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand">📰 Pengumuman</div>
            {items.length > 1 ? <div className="text-[11px] text-mut">{idx + 1}/{items.length}</div> : null}
          </div>
          <div className="font-extrabold text-lg mb-1">{n.title}</div>
          {n.body ? <div className="text-sm text-ink whitespace-pre-wrap">{n.body}</div> : null}
          <button onClick={next} disabled={busy} aria-busy={busy}
            className="btn btn-pri w-full justify-center mt-4 py-2.5">
            {busy ? "…" : last ? "Mengerti" : "Berikutnya"}
          </button>
        </div>
      </div>
    </div>
  );
}
