import Link from "next/link";
import { q, q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

async function counts() {
  const r = await q1<any>(`
    SELECT
      (SELECT count(*) FROM sjp_employee WHERE is_salesman) AS salesman,
      (SELECT count(*) FROM sjp_customer) AS customer,
      (SELECT count(*) FROM sjp_customer_geo) AS geo,
      (SELECT count(*) FROM sjp_assignment WHERE is_active) AS assignment,
      (SELECT count(*) FROM sjp_schedule WHERE tgl = CURRENT_DATE) AS sched_today,
      (SELECT count(*) FROM sjp_visit_log WHERE tgl = CURRENT_DATE) AS visit_today,
      (SELECT count(*) FROM sjp_lov WHERE is_active) AS lov,
      (SELECT count(*) FROM sjp_prospect WHERE status='BELUM') AS prospek
  `);
  return r || {};
}

function Kpi({ label, value, sub, tone = "brand" }: any) {
  const bar: any = { brand: "before:bg-brand", ok: "before:bg-ok", warn: "before:bg-warn", info: "before:bg-info" };
  return (
    <div className={`card p-4 relative overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${bar[tone]}`}>
      <div className="text-xs text-mut font-medium">{label}</div>
      <div className="text-3xl font-extrabold mt-1 tracking-tight">{value}</div>
      {sub ? <div className="text-[11px] text-mut mt-0.5">{sub}</div> : null}
    </div>
  );
}

// ── Papan Kunjungan per salesman untuk 1 tanggal ──────────────────────────────
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function VisitBoard({ d }: { d: string }) {
  // kolom: salesman yang punya jadwal ATAU kunjungan hari itu
  const cols = await q<any>(`
    WITH plan AS (SELECT emp_id, count(*) n FROM sjp_schedule WHERE tgl=$1 GROUP BY emp_id),
         vis  AS (SELECT emp_id,
                         count(*) FILTER (WHERE sched_id IS NOT NULL) done,
                         count(*) total,
                         count(*) FILTER (WHERE is_oos) oos
                  FROM sjp_visit_log WHERE tgl=$1 GROUP BY emp_id)
    SELECT e.emp_id, e.emp_name,
           COALESCE(p.n,0)     AS plan,
           COALESCE(v.done,0)  AS realisasi,
           COALESCE(v.total,0) AS total_visit,
           COALESCE(v.oos,0)   AS oos
    FROM sjp_employee e
    LEFT JOIN plan p ON p.emp_id=e.emp_id
    LEFT JOIN vis  v ON v.emp_id=e.emp_id
    WHERE e.is_salesman AND (p.n IS NOT NULL OR v.total IS NOT NULL)
    ORDER BY e.emp_name`, [d]);

  // semua kunjungan hari itu (termasuk OOS) untuk dikelompokkan per salesman
  const visits = await q<any>(`
    SELECT v.emp_id, v.visit_id, to_char(v.checkin_dt,'HH24:MI') jam,
           COALESCE(c.cust_name,p.nama_usaha,v.cust_code,v.prospek_id) nama,
           v.is_oos, v.gps_valid,
           COALESCE((SELECT string_agg(x.teks, ', ') FROM sjp_lov x WHERE x.lov_id = ANY(v.catatan_lov_ids)), l.teks) catatan,
           (v.photo IS NOT NULL OR v.photo_path IS NOT NULL) ada_foto
    FROM sjp_visit_log v
    LEFT JOIN sjp_customer c ON c.cust_code=v.cust_code
    LEFT JOIN sjp_prospect p ON p.prospek_id=v.prospek_id
    LEFT JOIN sjp_lov l ON l.lov_id=v.catatan_lov_id
    WHERE v.tgl=$1
    ORDER BY v.checkin_dt`, [d]);

  const byEmp: Record<string, any[]> = {};
  for (const v of visits) (byEmp[v.emp_id] ||= []).push(v);

  // navigasi tanggal
  const base = new Date(d + "T00:00:00");
  const prev = new Date(base); prev.setDate(base.getDate() - 1);
  const next = new Date(base); next.setDate(base.getDate() + 1);
  const today = ymd(new Date());
  const dlabel = base.toLocaleDateString("id", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  const totPlan = cols.reduce((s: number, c: any) => s + Number(c.plan), 0);
  const totReal = cols.reduce((s: number, c: any) => s + Number(c.realisasi), 0);
  const totOos = cols.reduce((s: number, c: any) => s + Number(c.oos), 0);

  return (
    <div className="card p-5 mt-5">
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
        <div className="font-bold">Papan Kunjungan Harian</div>
        <div className="flex items-center gap-1.5 text-sm">
          <Link href={`/?d=${ymd(prev)}`} className="btn btn-sm">‹</Link>
          <form method="GET" action="/" className="contents">
            <input type="date" name="d" defaultValue={d} max={today} className="inp !py-1.5 !w-auto text-sm" />
            <button className="btn btn-sm" type="submit">Lihat</button>
          </form>
          <Link href={`/?d=${ymd(next)}`} className="btn btn-sm">›</Link>
          <Link href="/" className="btn btn-sm">Hari ini</Link>
        </div>
      </div>
      <div className="text-xs text-mut mb-3">
        {dlabel} · Realisasi <b>{totReal}</b>/<b>{totPlan}</b> ({pct(totReal, totPlan)}%){totOos ? <> · <span className="text-info">{totOos} OOS</span></> : null}
      </div>

      {cols.length === 0 ? (
        <div className="text-sm text-mut py-6 text-center">Tidak ada jadwal maupun kunjungan pada tanggal ini.</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {cols.map((c: any) => {
            const list = byEmp[c.emp_id] || [];
            const comp = pct(Number(c.realisasi), Number(c.plan));
            const tone = c.plan === 0 ? "p-info" : comp >= 80 ? "p-ok" : comp >= 50 ? "p-warn" : "p-bad";
            return (
              <div key={c.emp_id} className="flex-shrink-0 w-[230px] border border-line rounded-xl bg-[#fafbfc]">
                <div className="p-2.5 border-b border-line sticky top-0 bg-[#fafbfc] rounded-t-xl">
                  <div className="font-bold text-sm truncate" title={c.emp_name}>{c.emp_name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`pill ${tone}`}>{c.realisasi}/{c.plan} sesuai jadwal</span>
                    {Number(c.oos) > 0 ? <span className="pill p-info">+{c.oos} OOS</span> : null}
                  </div>
                </div>
                <div className="p-2 space-y-1.5 min-h-[60px]">
                  {list.length === 0 ? (
                    <div className="text-[11px] text-mut text-center py-3">Belum ada check-in</div>
                  ) : list.map((v: any) => (
                    <Link key={v.visit_id} href={`/hos/evidence/${v.visit_id}`}
                      className="block border border-line rounded-lg bg-white p-2 hover:bg-[#f6f7f9]">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-[12px] truncate">{v.nama}</span>
                        <span className="text-[10px] text-mut flex-shrink-0">{v.jam}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {v.is_oos ? <span className="pill p-info">OOS</span> : null}
                        <span className={`pill ${v.gps_valid ? "p-ok" : "p-bad"}`}>{v.gps_valid ? "GPS✓" : "GPS luar"}</span>
                        {v.ada_foto ? <span className="text-[11px]">📷</span> : null}
                      </div>
                      {v.catatan ? <div className="text-[10px] text-mut mt-0.5 truncate">{v.catatan}</div> : null}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="text-[10px] text-mut mt-2">Kolom = salesman (realisasi/jadwal) · isi = customer yang check-in (termasuk OOS) · klik untuk lihat bukti. Monitoring lengkap di app HOS.</div>
    </div>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: { d?: string } }) {
  const c = await counts();
  const d = searchParams.d && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.d) ? searchParams.d : ymd(new Date());
  return (
    <>
      <div className="mb-1 text-xl font-bold">Dashboard Monitoring</div>
      <div className="text-sm text-mut mb-5">Ringkasan data SJP</div>

      <div className="grid grid-cols-4 gap-4 mb-5 max-[900px]:grid-cols-2">
        <Kpi label="Salesman aktif" value={c.salesman ?? "—"} tone="info" />
        <Kpi label="Customer" value={Number(c.customer ?? 0).toLocaleString("id")} sub={`${c.geo ?? 0} berkoordinat`} />
        <Kpi label="Assignment aktif" value={c.assignment ?? 0} tone="ok" />
        <Kpi label="LOV aktif" value={c.lov ?? 0} tone="warn" />
      </div>

      <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
        <Kpi label="Jadwal hari ini" value={c.sched_today ?? 0} tone="info" />
        <Kpi label="Kunjungan hari ini" value={c.visit_today ?? 0} tone="ok" />
        <Kpi label="Prospek belum ditautkan" value={c.prospek ?? 0} tone="warn" />
      </div>

      <VisitBoard d={d} />
    </>
  );
}
