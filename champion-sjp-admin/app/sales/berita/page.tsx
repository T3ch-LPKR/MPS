import { q } from "@/lib/db";
import { getSession } from "@/lib/session";
import NewsViewer, { NewsItem } from "@/components/NewsViewer";

export const dynamic = "force-dynamic";

export default async function SalesBerita() {
  const rows = await q<any>(`
    SELECT news_id, title, body, start_date, end_date, (photo IS NOT NULL) AS has_photo
      FROM sjp_news
     WHERE is_active AND CURRENT_DATE BETWEEN start_date AND end_date
       AND 'salesman' = ANY(target_roles)
     ORDER BY created_at DESC`);

  // buka menu Berita = tandai semua dibaca (badge berkurang)
  const user = await getSession();
  if (user?.user_id && rows.length)
    await q(`INSERT INTO sjp_news_read (news_id, user_id)
             SELECT unnest($1::bigint[]), $2 ON CONFLICT DO NOTHING`,
      [rows.map((r: any) => r.news_id), user.user_id]);
  const fmt = (d: string) => new Date(d).toLocaleDateString("id", { day: "2-digit", month: "short" });
  const items: NewsItem[] = rows.map((n: any) => ({
    news_id: n.news_id, title: n.title, body: n.body, has_photo: n.has_photo,
    period: `${fmt(n.start_date)} – ${fmt(n.end_date)}`,
  }));

  return (
    <div className="p-4 space-y-3">
      <div className="text-lg font-extrabold px-1">📰 Berita</div>
      <NewsViewer items={items} />
    </div>
  );
}
