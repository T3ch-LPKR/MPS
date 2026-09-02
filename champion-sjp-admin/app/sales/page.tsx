import Link from "next/link";
import { q, q1 } from "@/lib/db";
import { getSession } from "@/lib/session";
import { requireClockIn } from "@/lib/attendanceGuard";
import { withNewsPhotoUrl } from "@/lib/newsPhoto";
import NewsModal from "@/components/NewsModal";

export const dynamic = "force-dynamic";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default async function SalesHome() {
  const user = await getSession();
  const emp = user?.emp_id || "";
  await requireClockIn(emp); // paksa absen masuk dulu bila mandatory
  const now = new Date();
  const tgl = `${HARI[now.getDay()]}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;

  // Berita aktif utk salesman yang belum dibaca -> popup (non-fatal: jangan 500-kan halaman)
  let news: any[] = [];
  if (user?.user_id) {
    try {
      const nr = await q<any>(`
        SELECT news_id, title, body, photo_path, (photo IS NOT NULL) AS has_bytea
          FROM sjp_news n
         WHERE is_active AND CURRENT_DATE BETWEEN start_date AND end_date
           AND 'salesman' = ANY(target_roles)
           AND NOT EXISTS (SELECT 1 FROM sjp_news_read r WHERE r.news_id=n.news_id AND r.user_id=$1)
         ORDER BY created_at DESC`, [user.user_id]);
      news = await withNewsPhotoUrl(nr);
    } catch { news = []; }
  }

  if (!emp) {
    return <div className="p-4"><div className="card p-4 text-sm text-mut">Akun ini belum ditautkan ke salesman (emp_id). Minta Admin set di menu Kelola User.</div></div>;
  }

  // rentang bulan berjalan (local date) untuk kartu pencapaian
  const y = now.getFullYear(), mo = now.getMonth();
  const p2 = (n: number) => String(n).padStart(2, "0");
  const first = `${y}-${p2(mo + 1)}-01`;
  const last = `${y}-${p2(mo + 1)}-${p2(new Date(y, mo + 1, 0).getDate())}`;
  const monthLabel = `${BULAN[mo]} ${y}`;

  // jadwal hari ini (inti) — sekuensial (kurangi koneksi serentak di serverless)
  let rows: any[] = [];
  try {
    rows = await q<any>(`
    SELECT s.sched_id, s.cust_code, c.cust_name, c.address, s.jam_target::text AS jam, s.status,
           a.frekuensi,
           (g.cust_code IS NOT NULL) AS has_geo,
           ar.ar_outstanding,
           (v.visit_id IS NOT NULL) AS visited
    FROM sjp_schedule s
    JOIN sjp_customer c ON c.cust_code = s.cust_code
    LEFT JOIN sjp_assignment a ON a.cust_code=s.cust_code AND a.emp_id=s.emp_id
    LEFT JOIN sjp_customer_geo g ON g.cust_code=s.cust_code
    LEFT JOIN sjp_customer_ar ar ON ar.cust_code=s.cust_code
    LEFT JOIN sjp_visit_log v ON v.sched_id = s.sched_id
    WHERE s.emp_id = $1 AND s.tgl = CURRENT_DATE
    ORDER BY (v.visit_id IS NOT NULL OR s.status='DONE') ASC, c.cust_name ASC`, [emp]);
  } catch {
    return <div className="p-4"><div className="card p-4 text-sm text-mut">Gagal memuat data. Coba tarik untuk segarkan atau buka lagi.</div></div>;
  }

  // pencapaian bulan ini — non-fatal
  let ach: any = null;
  try {
    ach = await q1<any>(`
    SELECT
      (SELECT count(*) FROM sjp_schedule  WHERE emp_id=$1 AND tgl BETWEEN $2 AND $3) AS plan,
      (SELECT count(*) FROM sjp_visit_log WHERE emp_id=$1 AND tgl BETWEEN $2 AND $3 AND sched_id IS NOT NULL) AS done,
      (SELECT count(*) FROM sjp_visit_log WHERE emp_id=$1 AND tgl BETWEEN $2 AND $3) AS visit,
      (SELECT count(*) FROM sjp_visit_log WHERE emp_id=$1 AND tgl BETWEEN $2 AND $3 AND is_effective_call) AS eff,
      (SELECT count(*) FROM sjp_visit_log WHERE emp_id=$1 AND tgl BETWEEN $2 AND $3 AND is_oos) AS oos,
      (SELECT count(*) FROM sjp_visit_log v JOIN sjp_lov l ON l.lov_id=v.catatan_lov_id
         WHERE v.emp_id=$1 AND v.tgl BETWEEN $2 AND $3 AND l.kode='LOV-07') AS ar_follow
    `, [emp, first, last]);
  } catch { ach = null; }

  const pctf = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const mPlan = Number(ach?.plan || 0), mDone = Number(ach?.done || 0);
  const mVisit = Number(ach?.visit || 0), mEff = Number(ach?.eff || 0);
  const mOos = Number(ach?.oos || 0), mAr = Number(ach?.ar_follow || 0);
  const mCompliance = pctf(mDone, mPlan);
  const mEffPct = pctf(mEff, mVisit);

  const total = rows.length;
  const done = rows.filter((r) => r.visited || r.status === "DONE").length;
  const pending = rows.filter((r) => !(r.visited || r.status === "DONE"));
  const finished = rows.filter((r) => r.visited || r.status === "DONE");
  const pct = total ? Math.round((done / total) * 100) : 0;
  const rp = (n: any) => "Rp " + Number(n || 0).toLocaleString("id");
  const FREK: any = { W: "Weekly", BW: "Bi-Weekly", M: "Monthly", C: "Custom" };

  return (
    <div className="p-4 space-y-3">
      <NewsModal items={news} />
      <div className="card p-4">
        <div className="text-lg font-extrabold">Halo, {(user?.full_name || "Salesman").split(" ")[0]} 👋</div>
        <div className="text-xs text-mut">{tgl}</div>
        <div className="mt-3">
          <div className="flex justify-between text-xs font-semibold mb-1"><span>Progress kunjungan</span><span>{done} / {total} selesai</span></div>
          <div className="h-2 bg-line rounded"><div className="h-full bg-ok rounded" style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1 bg-[#eef0f3] rounded-lg p-2 text-center"><div className="text-xl font-extrabold">{total}</div><div className="text-[11px] text-mut">Plan</div></div>
          <div className="flex-1 bg-[#eef0f3] rounded-lg p-2 text-center"><div className="text-xl font-extrabold text-ok">{done}</div><div className="text-[11px] text-mut">Selesai</div></div>
          <div className="flex-1 bg-[#eef0f3] rounded-lg p-2 text-center"><div className="text-xl font-extrabold text-warn">{total - done}</div><div className="text-[11px] text-mut">Belum</div></div>
        </div>
      </div>

      {/* Pencapaian bulan ini (berbasis kunjungan) */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-bold">🏆 Pencapaian {monthLabel}</div>
          {mOos > 0 ? <span className="pill p-info">+{mOos} luar jadwal</span> : null}
        </div>
        <div className="flex justify-between text-xs font-semibold mb-1">
          <span>Compliance kunjungan</span><span>{mDone} / {mPlan} terjadwal</span>
        </div>
        <div className="h-2 bg-line rounded">
          <div className={`h-full rounded ${mCompliance >= 80 ? "bg-ok" : mCompliance >= 50 ? "bg-warn" : "bg-bad"}`} style={{ width: `${mCompliance}%` }} />
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1 bg-[#eef0f3] rounded-lg p-2 text-center"><div className="text-xl font-extrabold">{mCompliance}%</div><div className="text-[11px] text-mut">Compliance</div></div>
          <div className="flex-1 bg-[#eef0f3] rounded-lg p-2 text-center"><div className="text-xl font-extrabold">{mVisit}</div><div className="text-[11px] text-mut">Kunjungan</div></div>
          <div className="flex-1 bg-[#eef0f3] rounded-lg p-2 text-center"><div className="text-xl font-extrabold text-ok">{mEffPct}%</div><div className="text-[11px] text-mut">Effective</div></div>
          <div className="flex-1 bg-[#eef0f3] rounded-lg p-2 text-center"><div className="text-xl font-extrabold text-brand">{mAr}</div><div className="text-[11px] text-mut">AR ditindak</div></div>
        </div>
      </div>

      <Link href="/sales/oos" className="block text-center border-2 border-dashed border-brand text-brand font-semibold rounded-xl py-2.5 text-sm">
        ➕ Kunjungan Luar Jadwal (OOS)
      </Link>

      {total === 0 ? (
        <div className="card p-4 text-sm text-mut text-center">Belum ada jadwal untuk hari ini. Hubungi Admin untuk generate jadwal, atau lakukan kunjungan luar jadwal.</div>
      ) : null}

      {pending.length ? <div className="text-[11px] uppercase tracking-wide text-mut font-bold px-1 pt-1">Belum dikunjungi ({pending.length})</div> : null}
      {pending.map((r) => (
        <Link key={r.sched_id} href={`/sales/kunjungan/${r.sched_id}`} className="card p-3 flex items-center gap-3 active:opacity-70">
          <div className="w-11 h-11 rounded-xl bg-brand-soft text-brand grid place-items-center font-extrabold flex-shrink-0">
            {(r.cust_name || "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{r.cust_name}</div>
            <div className="text-[11px] text-mut truncate">📍 {r.address || "-"}</div>
            <div className="mt-1 flex gap-1 flex-wrap">
              {r.frekuensi ? <span className="pill p-info">{FREK[r.frekuensi]}</span> : null}
              {Number(r.ar_outstanding) > 0 ? <span className="pill p-bad">AR {rp(r.ar_outstanding)}</span> : null}
              {!r.has_geo ? <span className="pill p-mut">tanpa titik GPS</span> : null}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs font-bold">{r.jam ? r.jam.slice(0, 5) : ""}</div>
            <div className="text-2xl text-[#c7ccd4]">›</div>
          </div>
        </Link>
      ))}

      {finished.length ? <div className="text-[11px] uppercase tracking-wide text-mut font-bold px-1 pt-2">Sudah dikunjungi ({finished.length})</div> : null}
      {finished.map((r) => (
        <div key={r.sched_id} className="card p-3 flex items-center gap-3 opacity-70">
          <div className="w-11 h-11 rounded-xl bg-[#e7f6ec] text-ok grid place-items-center font-extrabold flex-shrink-0">
            {(r.cust_name || "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{r.cust_name}</div>
            <div className="text-[11px] text-ok">✓ Sudah check-in</div>
          </div>
          <span className="pill p-ok">Selesai</span>
        </div>
      ))}
    </div>
  );
}
