import { q } from "@/lib/db";
import { withNewsPhotoUrl } from "@/lib/newsPhoto";
import NewsViewer, { NewsItem } from "@/components/NewsViewer";

export const dynamic = "force-dynamic";

export default async function HosBerita() {
  const rows = await q<any>(`
    SELECT news_id, title, body, start_date, end_date, photo_path, (photo IS NOT NULL) AS has_bytea
      FROM sjp_news
     WHERE is_active AND CURRENT_DATE BETWEEN start_date AND end_date
       AND 'hos' = ANY(target_roles)
     ORDER BY created_at DESC`);
  const withUrl = await withNewsPhotoUrl(rows);
  const fmt = (d: string) => new Date(d).toLocaleDateString("id", { day: "2-digit", month: "short" });
  const items: NewsItem[] = withUrl.map((n: any) => ({
    news_id: n.news_id, title: n.title, body: n.body, photo_url: n.photo_url,
    period: `${fmt(n.start_date)} – ${fmt(n.end_date)}`,
  }));

  return (
    <div className="p-4 space-y-3">
      <div className="text-lg font-extrabold px-1">📰 Berita</div>
      <NewsViewer items={items} />
    </div>
  );
}
