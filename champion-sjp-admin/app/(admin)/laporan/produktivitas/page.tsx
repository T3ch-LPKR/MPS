import Link from "next/link";
import { q } from "@/lib/db";
import { resolvePeriod, type PeriodSP } from "../period";
import PeriodFilter from "../PeriodFilter";
import SortableTable, { type Col } from "../SortableTable";
import { DistBar } from "../Charts";
import KpiStrip from "../KpiStrip";

export const dynamic = "force-dynamic";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const rp = (n: any) => "Rp " + Number(n || 0).toLocaleString("id");
const compTone = (p: number, plan: number) => (plan === 0 ? "p-mut" : p >= 80 ? "p-ok" : p >= 50 ? "p-warn" : "p-bad");

function Tabs() {
  return (
    <div className="flex gap-2 mb-3 text-sm">
      <Link href="/laporan/produktivitas" className="btn btn-pri btn-sm">Produktivitas</Link>
      <Link href="/laporan/issue" className="btn btn-sm">Issue Lapangan</Link>
    </div>
  );
}

export default async function ProduktivitasPage({ searchParams }: { searchParams: PeriodSP }) {
  const { first, last, label } = resolvePeriod(searchParams);
  const femp = searchParams.femp || "";
  const salesmen = await q<any>(`SELECT emp_id, emp_name FROM sjp_employee WHERE is_salesman ORDER BY emp_name`);

  const rows = await q<any>(`
    SELECT e.emp_id, e.emp_name,
     (SELECT count(*) FROM sjp_schedule  s WHERE s.emp_id=e.emp_id AND s.tgl BETWEEN $1 AND $2) plan,
     (SELECT count(*) FROM sjp_visit_log v WHERE v.emp_id=e.emp_id AND v.tgl BETWEEN $1 AND $2 AND v.sched_id IS NOT NULL) done,
     (SELECT count(*) FROM sjp_visit_log v WHERE v.emp_id=e.emp_id AND v.tgl BETWEEN $1 AND $2) visit,
     (SELECT count(*) FROM sjp_visit_log v WHERE v.emp_id=e.emp_id AND v.tgl BETWEEN $1 AND $2 AND v.is_effective_call) eff,
     (SELECT count(*) FROM sjp_visit_log v WHERE v.emp_id=e.emp_id AND v.tgl BETWEEN $1 AND $2 AND v.is_oos) oos,
     (SELECT count(*) FROM sjp_visit_log v WHERE v.emp_id=e.emp_id AND v.tgl BETWEEN $1 AND $2
        AND EXISTS(SELECT 1 FROM sjp_lov l WHERE l.lov_id=ANY(COALESCE(v.catatan_lov_ids,ARRAY[v.catatan_lov_id])) AND l.kode='LOV-07')) ar_follow,
     (SELECT COALESCE(SUM(v.ar_amount),0) FROM sjp_visit_log v WHERE v.emp_id=e.emp_id AND v.tgl BETWEEN $1 AND $2 AND v.ar_collect IS NOT NULL) ar_amount,
     (SELECT count(DISTINCT a.tgl) FROM sjp_attendance a WHERE a.emp_id=e.emp_id AND a.tgl BETWEEN $1 AND $2 AND a.mode='MASUK') hari_absen
    FROM sjp_employee e
    WHERE e.is_salesman AND ($3='' OR e.emp_id=$3)
    ORDER BY e.emp_name`, [first, last, femp]);

  const num = (x: any) => Number(x || 0);
  const T = rows.reduce((a: any, r: any) => ({
    plan: a.plan + num(r.plan), done: a.done + num(r.done), visit: a.visit + num(r.visit),
    eff: a.eff + num(r.eff), oos: a.oos + num(r.oos), ar_follow: a.ar_follow + num(r.ar_follow),
    ar_amount: a.ar_amount + num(r.ar_amount),
  }), { plan: 0, done: 0, visit: 0, eff: 0, oos: 0, ar_follow: 0, ar_amount: 0 });

  const tableRows = rows.map((r: any) => {
    const plan = num(r.plan), done = num(r.done), visit = num(r.visit);
    const comp = pct(done, plan);
    return {
      __key: r.emp_id, emp_name: r.emp_name, plan, done,
      comp, "__tone_comp": compTone(comp, plan),
      visit, effpct: pct(num(r.eff), visit), oos: num(r.oos),
      ar_follow: num(r.ar_follow), ar_amount: num(r.ar_amount), hari_absen: num(r.hari_absen),
    };
  });

  // sebaran tier + top/bottom (hanya salesman berjadwal)
  const withPlan = tableRows.filter((r) => r.plan > 0);
  const tierOk = withPlan.filter((r) => r.comp >= 80).length;
  const tierMid = withPlan.filter((r) => r.comp >= 50 && r.comp < 80).length;
  const tierLow = withPlan.filter((r) => r.comp < 50).length;
  const ranked = [...withPlan].sort((a, b) => b.comp - a.comp);
  const top = ranked.slice(0, 3);
  const bottom = ranked.slice(-3).reverse();

  const cols: Col[] = [
    { key: "emp_name", label: "Salesman", align: "left" },
    { key: "plan", label: "Plan", align: "center", fmt: "int" },
    { key: "done", label: "Realisasi", align: "center", fmt: "int" },
    { key: "comp", label: "Compliance", align: "left", fmt: "bar" },
    { key: "visit", label: "Kunjungan", align: "center", fmt: "int" },
    { key: "effpct", label: "Eff. Call", align: "center", fmt: "pct" },
    { key: "oos", label: "OOS", align: "center", fmt: "int" },
    { key: "ar_follow", label: "AR ditindak", align: "center", fmt: "int" },
    { key: "ar_amount", label: "AR tertagih", align: "right", fmt: "rp" },
    { key: "hari_absen", label: "Hari absen", align: "center", fmt: "int" },
  ];

  return (
    <>
      <div className="mb-1 text-xl font-bold">Laporan Produktivitas Salesman</div>
      <div className="text-sm text-mut mb-3">Ringkasan kinerja kunjungan per salesman</div>
      <Tabs />
      <PeriodFilter action="/laporan/produktivitas" sp={searchParams} salesmen={salesmen} label={label} />

      <KpiStrip items={[
        { label: "Plan", value: T.plan },
        { label: "Realisasi", value: T.done },
        { label: "Kepatuhan", value: `${pct(T.done, T.plan)}%`, sub: `${T.done}/${T.plan}`, lead: true },
        { label: "Total Kunjungan", value: T.visit },
        { label: "Luar Jadwal", value: T.oos },
        { label: "Effective Call", value: `${pct(T.eff, T.visit)}%`, sub: `${T.eff} reorder` },
        { label: "AR Tertagih", value: rp(T.ar_amount), sub: `${T.ar_follow} kunjungan` },
      ]} />

      <div className="card p-4 mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[13px] font-bold">Sebaran Kepatuhan</div>
          <div className="text-[11px] text-mut">{withPlan.length} salesman berjadwal</div>
        </div>
        <DistBar segments={[
          { label: "Baik ≥80%", value: tierOk, tone: "ok" },
          { label: "Sedang 50–79%", value: tierMid, tone: "warn" },
          { label: "Rendah <50%", value: tierLow, tone: "bad" },
        ]} />
        {withPlan.length ? (
          <div className="grid grid-cols-2 gap-3 mt-3 text-xs max-[600px]:grid-cols-1">
            <div><span className="text-mut font-semibold">Top:</span> {top.map((r) => `${r.emp_name} ${r.comp}%`).join(" · ")}</div>
            <div><span className="text-mut font-semibold">Terendah:</span> {bottom.map((r) => `${r.emp_name} ${r.comp}%`).join(" · ")}</div>
          </div>
        ) : null}
      </div>

      <div className="card p-4">
        <SortableTable columns={cols} rows={tableRows} initial={{ key: "comp", dir: "desc" }} empty="Tidak ada salesman." />
      </div>
      <div className="text-[11px] text-mut mt-2">Klik judul kolom untuk mengurutkan. Compliance = Realisasi ÷ Plan · Effective Call = kunjungan ber-catatan Reorder ÷ total kunjungan · AR tertagih = nominal penagihan (Lunas/Sebagian) yang dicatat salesman.</div>
    </>
  );
}
