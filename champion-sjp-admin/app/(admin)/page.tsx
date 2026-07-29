import { q1 } from "@/lib/db";

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

export default async function Dashboard() {
  const c = await counts();
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

      <div className="card p-5 mt-5 bg-[#e8f0fe] border-[#c7dbfc]">
        <div className="text-sm text-[#1e40af]">
          ℹ️ <b>Monitoring kunjungan</b> (peta rute, feed evidence, compliance) akan aktif setelah aplikasi{" "}
          <b>Salesman</b> mulai check-in. Saat ini fokus di <b>setting</b>: Master &amp; Assign, LOV, Generate jadwal, Prospek.
        </div>
      </div>
    </>
  );
}
