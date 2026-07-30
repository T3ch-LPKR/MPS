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

async function recentVisits() {
  return q<any>(`
    SELECT v.visit_id, to_char(v.checkin_dt,'DD Mon HH24:MI') waktu, e.emp_name,
           COALESCE(c.cust_name,p.nama_usaha,v.cust_code,v.prospek_id) nama,
           v.is_oos, v.gps_valid, l.teks catatan, (v.photo IS NOT NULL) ada_foto
    FROM sjp_visit_log v
    LEFT JOIN sjp_employee e ON e.emp_id=v.emp_id
    LEFT JOIN sjp_customer c ON c.cust_code=v.cust_code
    LEFT JOIN sjp_prospect p ON p.prospek_id=v.prospek_id
    LEFT JOIN sjp_lov l ON l.lov_id=v.catatan_lov_id
    ORDER BY v.checkin_dt DESC LIMIT 12`);
}

export default async function Dashboard() {
  const c = await counts();
  const visits = await recentVisits();
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

      {/* Kunjungan Terbaru + foto evidence */}
      <div className="card p-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold">Kunjungan Terbaru</div>
          <span className="text-xs text-mut">{visits.length} terbaru · monitoring lengkap di app HOS</span>
        </div>
        {visits.length === 0 ? (
          <div className="text-sm text-mut">Belum ada kunjungan. Muncul setelah salesman check-in.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
            {visits.map((v) => (
              <Link key={v.visit_id} href={`/hos/evidence/${v.visit_id}`} className="flex items-center gap-3 border border-line rounded-lg p-2 hover:bg-[#fafafa]">
                <div className="w-14 h-14 rounded-lg bg-[#e5e7eb] grid place-items-center overflow-hidden flex-shrink-0">
                  {v.ada_foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/photo/${v.visit_id}`} alt="" className="w-full h-full object-cover" />
                  ) : <span className="text-xl text-[#9ca3af]">📷</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{v.nama}</div>
                  <div className="text-[11px] text-mut truncate">{v.emp_name} · {v.waktu}</div>
                  <div className="text-[11px] mt-0.5">
                    {v.is_oos ? <span className="pill p-info mr-1">OOS</span> : null}
                    <span className={`pill ${v.gps_valid ? "p-ok" : "p-bad"}`}>{v.gps_valid ? "GPS valid" : "GPS luar"}</span>
                    <span className="text-mut ml-1">{v.catatan || ""}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
