"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { markNewsRead } from "@/app/newsRead";

export type NewsItem = {
  news_id: number;
  title: string;
  body: string | null;
  has_photo: boolean;
  period: string;
};

// Daftar berita (arsip) — kartu bisa diklik untuk lihat full-screen.
// Buka menu = tandai semua dibaca (server action + revalidate) -> badge unread berkurang.
export default function NewsViewer({ items }: { items: NewsItem[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<NewsItem | null>(null);

  useEffect(() => {
    if (!items.length) return;
    markNewsRead(items.map((i) => i.news_id)).then(() => router.refresh()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0)
    return <div className="card p-4 text-sm text-mut text-center">Belum ada berita aktif.</div>;

  return (
    <>
      {items.map((n) => (
        <button key={n.news_id} onClick={() => setSel(n)}
          className="card overflow-hidden w-full text-left active:opacity-70">
          {n.has_photo ? (
            <img src={`/api/news-photo/${n.news_id}`} alt="" className="w-full max-h-48 object-cover" />
          ) : null}
          <div className="p-3">
            <div className="font-bold flex items-center justify-between gap-2">
              <span className="truncate">{n.title}</span>
              <span className="text-[11px] text-brand font-semibold flex-shrink-0">Lihat ›</span>
            </div>
            <div className="text-[11px] text-mut mb-1">{n.period}</div>
            {n.body ? <div className="text-sm text-mut line-clamp-2">{n.body}</div> : null}
          </div>
        </button>
      ))}

      {sel ? (
        <div className="fixed inset-0 z-[100] bg-black/70 overflow-y-auto flex items-start justify-center"
          onClick={() => setSel(null)}>
          <div className="bg-white w-full max-w-[460px] min-h-screen" onClick={(e) => e.stopPropagation()}>
            <div className="bg-brand text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
              <button onClick={() => setSel(null)} className="text-xl leading-none">‹</button>
              <div className="font-bold text-sm flex-1 truncate">Berita</div>
              <button onClick={() => setSel(null)} className="text-[11px] bg-white/20 rounded-full px-3 py-1">Tutup</button>
            </div>
            {sel.has_photo ? (
              <img src={`/api/news-photo/${sel.news_id}`} alt="" className="w-full object-contain bg-[#f2f2f2]" />
            ) : null}
            <div className="p-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-brand mb-1">📰 Pengumuman</div>
              <div className="font-extrabold text-xl mb-1">{sel.title}</div>
              <div className="text-xs text-mut mb-3">{sel.period}</div>
              {sel.body ? <div className="text-sm whitespace-pre-wrap leading-relaxed">{sel.body}</div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
