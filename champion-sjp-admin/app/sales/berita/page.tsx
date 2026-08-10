/* eslint-disable @next/next/no-img-element */
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SalesBerita() {
  const rows = await q<any>(`
    SELECT news_id, title, body, start_date, end_date, (photo IS NOT NULL) AS has_photo
      FROM sjp_news
     WHERE is_active AND CURRENT_DATE BETWEEN start_date AND end_date
       AND 'salesman' = ANY(target_roles)
     ORDER BY created_at DESC`);
  const fmt = (d: string) => new Date(d).toLocaleDateString("id", { day: "2-digit", month: "short" });

  return (
    <div className="p-4 space-y-3">
      <div className="text-lg font-extrabold px-1">📰 Berita</div>
      {rows.length === 0 ? (
        <div className="card p-4 text-sm text-mut text-center">Belum ada berita aktif.</div>
      ) : rows.map((n: any) => (
        <div key={n.news_id} className="card overflow-hidden">
          {n.has_photo ? <img src={`/api/news-photo/${n.news_id}`} alt="" className="w-full max-h-48 object-cover" /> : null}
          <div className="p-3">
            <div className="font-bold">{n.title}</div>
            <div className="text-[11px] text-mut mb-1">{fmt(n.start_date)} – {fmt(n.end_date)}</div>
            {n.body ? <div className="text-sm whitespace-pre-wrap">{n.body}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
