"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { markNewsRead } from "@/app/newsRead";

type News = { news_id: number; title: string; body: string | null; has_photo: boolean };

// Popup berita saat buka app. Begitu TAMPIL -> semua berita ditandai dibaca (server action +
// revalidate cache) sehingga popup tak muncul lagi & badge unread berkurang.
export default function NewsModal({ items }: { items: News[] }) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!items.length) return;
    markNewsRead(items.map((i) => i.news_id)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (closed || items.length === 0 || idx >= items.length) return null;
  const n = items[idx];
  const last = idx + 1 >= items.length;

  function next() {
    if (last) { setClosed(true); router.refresh(); } else setIdx(idx + 1);
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 overflow-y-auto flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[400px] my-auto shadow-xl overflow-hidden">
        {n.has_photo ? (
          <img src={`/api/news-photo/${n.news_id}`} alt="" className="w-full max-h-60 object-contain bg-[#f2f2f2]" />
        ) : null}
        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand">📰 Pengumuman</div>
            {items.length > 1 ? <div className="text-[11px] text-mut">{idx + 1}/{items.length}</div> : null}
          </div>
          <div className="font-extrabold text-lg mb-1">{n.title}</div>
          {n.body ? <div className="text-sm text-ink whitespace-pre-wrap">{n.body}</div> : null}
          <button onClick={next} className="btn btn-pri w-full justify-center mt-4 py-2.5">
            {last ? "Mengerti" : "Berikutnya"}
          </button>
        </div>
      </div>
    </div>
  );
}
