import Link from "next/link";
import { q, q1 } from "@/lib/db";
import { toggleNews, deleteNews, resetNewsRead } from "./actions";
import NewsForm, { NewsInitial } from "./NewsForm";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = { salesman: "Salesman", hos: "HOS", collector: "Collector" };

export default async function BeritaPage({ searchParams }: { searchParams: { edit?: string } }) {
  const editId = Number(searchParams.edit || 0) || 0;
  const initial: NewsInitial | undefined = editId
    ? (await q1<any>(`
        SELECT news_id, title, body, target_roles, (photo IS NOT NULL) AS has_photo,
               to_char(start_date,'YYYY-MM-DD') AS start_date,
               to_char(end_date,'YYYY-MM-DD') AS end_date
          FROM sjp_news WHERE news_id=$1`, [editId])) || undefined
    : undefined;

  const rows = await q<any>(`
    SELECT news_id, title, start_date, end_date, target_roles, is_active,
           (photo IS NOT NULL) AS has_photo,
           (is_active AND CURRENT_DATE BETWEEN start_date AND end_date) AS tayang,
           (SELECT count(*) FROM sjp_news_read r WHERE r.news_id=n.news_id) AS dibaca
      FROM sjp_news n
     ORDER BY created_at DESC`);

  const fmt = (d: string) => new Date(d).toLocaleDateString("id", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <div className="mb-1 text-xl font-bold">Berita / Pengumuman</div>
      <div className="text-sm text-mut mb-5">Tampil sebagai popup saat salesman/HOS membuka app (sekali baca ditandai), dan di menu Berita.</div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-start">
        <div className="card p-5">
          <div className="font-bold mb-3">{initial ? "Edit Berita" : "Berita Baru"}</div>
          <NewsForm key={initial?.news_id ?? "new"} initial={initial} />
        </div>

        <div className="card p-5">
          <div className="font-bold mb-3">Daftar Berita</div>
          {rows.length === 0 ? (
            <div className="text-sm text-mut">Belum ada berita.</div>
          ) : (
            <table className="w-full border-collapse">
              <thead><tr>
                <th className="th">Judul</th><th className="th">Periode</th><th className="th">Target</th>
                <th className="th">Status</th><th className="th">Dibaca</th><th className="th">Aksi</th>
              </tr></thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.news_id} className="hover:bg-[#fafafa]">
                    <td className="td">
                      <div className="font-semibold flex items-center gap-1">{r.has_photo ? "📷" : ""} {r.title}</div>
                    </td>
                    <td className="td text-xs whitespace-nowrap">{fmt(r.start_date)} – {fmt(r.end_date)}</td>
                    <td className="td text-xs">{(r.target_roles || []).map((x: string) => ROLE_LABEL[x] || x).join(", ")}</td>
                    <td className="td">
                      {r.tayang ? <span className="pill p-ok">Tayang</span>
                        : r.is_active ? <span className="pill p-mut">Terjadwal/Lewat</span>
                        : <span className="pill p-warn">Nonaktif</span>}
                    </td>
                    <td className="td text-xs">{r.dibaca}</td>
                    <td className="td whitespace-nowrap">
                      <Link href={`/berita?edit=${r.news_id}`} className="btn btn-sm">Edit</Link>
                      {Number(r.dibaca) > 0 ? (
                        <form action={resetNewsRead} className="inline ml-1">
                          <input type="hidden" name="news_id" value={r.news_id} />
                          <SubmitButton className="btn btn-sm" pendingText="…">Reset Dibaca</SubmitButton>
                        </form>
                      ) : null}
                      <form action={toggleNews} className="inline ml-1">
                        <input type="hidden" name="news_id" value={r.news_id} />
                        <SubmitButton className="btn btn-sm" pendingText="…">{r.is_active ? "Nonaktifkan" : "Aktifkan"}</SubmitButton>
                      </form>
                      <form action={deleteNews} className="inline ml-1">
                        <input type="hidden" name="news_id" value={r.news_id} />
                        <SubmitButton className="btn btn-sm" pendingText="…">Hapus</SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
