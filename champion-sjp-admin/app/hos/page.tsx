import Link from "next/link";
import { q, q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function ymdToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function pct(a: number, b: number) { return b ? Math.round((a / b) * 100) : 0; }

export default async function HosOverview({ searchParams }: { searchParams: { d?: string } }) {
  const d = searchParams.d || ymdToday();
  const dt = new Date(d + "T00:00:00");
  const label = `${HARI[dt.getDay()]}, ${dt.getDate()} ${BULAN[dt.getMonth()]} ${dt.getFullYear()}`;

  const k = await q1<any>(`
    SELECT
      (SELECT count(*) FROM sjp_schedule WHERE tgl=$1) AS plan,
      (SELECT count(*) FROM sjp_visit_log WHERE tgl=$1 AND sched_id IS NOT NULL) AS realisasi,
      (SELECT count(*) FROM sjp_visit_log WHERE tgl=$1) AS visit,
      (SELECT count(*) FROM sjp_visit_log WHERE tgl=$1 AND is_effective_call) AS eff,
      (SELECT count(*) FROM sjp_visit_log WHERE tgl=$1 AND is_oos) AS oos
  `, [d]);

  const rows = await q<any>(`
    SELECT e.emp_id, e.emp_name,
      (SELECT count(*) FROM sjp_schedule s WHERE s.emp_id=e.emp_id AND s.tgl=$1) AS plan,
      (SELECT count(*) FROM sjp_visit_log v WHERE v.emp_id=e.emp_id AND v.tgl=$1 AND v.sched_id IS NOT NULL) AS done,
      (SELECT count(*) FROM sjp_visit_log v WHERE v.emp_id=e.emp_id AND v.tgl=$1) AS visit
    FROM sjp_employee e WHERE e.is_salesman
  `, [d]);

  const withPlan = rows.filter((r) => Number(r.plan) > 0)
    .map((r) => ({ ...r, comp: pct(Number(r.done), Number(r.plan)) }))
    .sort((a, b) => a.comp - b.comp);
  const exception = withPlan.filter((r) => r.comp < 70);

  const compliance = pct(Number(k?.realisasi || 0), Number(k?.plan || 0));
  const effPct = pct(Number(k?.eff || 0), Number(k?.visit || 0));

  const dayLink = (delta: number) => {
    const x = new Date(dt); x.setDate(dt.getDate() + delta);
    return `/hos?d=${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  };

  function Kpi({ label, val, sub, tone }: any) {
    const c: any = { brand: "before:bg-brand", ok: "before:bg-ok", warn: "before:bg-warn", info: "before:bg-info" };
    return (
      <div className={`bg-white rounded-xl p-3 shadow-sm relative overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${c[tone] || c.brand}`}>
        <div className="text-[11px] text-mut font-medium">{label}</div>
        <div className="text-2xl font-extrabold leading-tight">{val}</div>
        {sub ? <div className="text-[10px] text-mut">{sub}</div> : null}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* day picker */}
      <div className="flex items-center gap-2">
        <Link href={dayLink(-1)} className="btn btn-sm">‹</Link>
        <form className="flex-1"><input type="date" name="d" defaultValue={d} className="inp !py-1.5 text-sm" /></form>
        <Link href={dayLink(1)} className="btn btn-sm">›</Link>
        <Link href="/hos" className="btn btn-sm">Hari ini</Link>
      </div>
      <div className="text-xs text-mut -mt-1">📆 {label}</div>

      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Plan" val={k?.plan ?? 0} tone="info" />
        <Kpi label="Realisasi" val={k?.realisasi ?? 0} sub={`${compliance}% compliance`} tone="ok" />
        <Kpi label="Luar Jadwal" val={k?.oos ?? 0} tone="warn" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Compliance" val={`${compliance}%`} tone="ok" />
        <Kpi label="Effective Call" val={`${effPct}%`} sub={`${k?.eff ?? 0}/${k?.visit ?? 0} visit`} tone="brand" />
      </div>

      {exception.length ? (
        <>
          <div className="text-[11px] uppercase tracking-wide text-bad font-bold px-1 pt-1">⚠️ Perlu Perhatian ({exception.length})</div>
          {exception.map((r) => (
            <Link key={r.emp_id} href={`/hos/salesman/${r.emp_id}?d=${d}`} className="bg-[#fdeaea] border-l-4 border-bad rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white text-bad grid place-items-center font-extrabold">{(r.emp_name || "?").slice(0, 2)}</div>
              <div className="flex-1"><div className="font-bold text-sm">{r.emp_name}</div><div className="text-[11px] text-mut">{r.done}/{r.plan} kunjungan</div></div>
              <span className="pill p-bad">{r.comp}%</span>
            </Link>
          ))}
        </>
      ) : null}

      <div className="text-[11px] uppercase tracking-wide text-mut font-bold px-1 pt-1">Semua Salesman (urut compliance)</div>
      {withPlan.length === 0 ? (
        <div className="bg-white rounded-xl p-4 text-sm text-mut text-center">Tidak ada jadwal untuk hari ini.</div>
      ) : withPlan.map((r) => (
        <Link key={r.emp_id} href={`/hos/salesman/${r.emp_id}?d=${d}`} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-soft text-brand grid place-items-center font-extrabold">{(r.emp_name || "?").slice(0, 2)}</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{r.emp_name}</div>
            <div className="text-[11px] text-mut">{r.done}/{r.plan}{Number(r.visit) > Number(r.done) ? ` · +${Number(r.visit) - Number(r.done)} OOS` : ""}</div>
            <div className="h-1.5 bg-line rounded mt-1"><div className={`h-full rounded ${r.comp >= 80 ? "bg-ok" : r.comp >= 50 ? "bg-warn" : "bg-bad"}`} style={{ width: `${r.comp}%` }} /></div>
          </div>
          <span className={`pill ${r.comp >= 80 ? "p-ok" : r.comp >= 50 ? "p-warn" : "p-bad"}`}>{r.comp}%</span>
        </Link>
      ))}
    </div>
  );
}
