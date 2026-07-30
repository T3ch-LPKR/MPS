import { q, q1 } from "@/lib/db";

export const dynamic = "force-dynamic";
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
function pct(a: number, b: number) { return b ? Math.round((a / b) * 100) : 0; }

export default async function Recap({ searchParams }: { searchParams: { m?: string } }) {
  const now = new Date();
  const m = searchParams.m || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yy, mm] = m.split("-").map(Number);
  const first = `${yy}-${String(mm).padStart(2, "0")}-01`;
  const last = `${yy}-${String(mm).padStart(2, "0")}-${new Date(yy, mm, 0).getDate()}`;

  const tot = await q1<any>(`
    SELECT
      (SELECT count(*) FROM sjp_visit_log WHERE tgl BETWEEN $1 AND $2) visit,
      (SELECT count(*) FROM sjp_visit_log WHERE tgl BETWEEN $1 AND $2 AND is_effective_call) eff,
      (SELECT count(*) FROM sjp_visit_log WHERE tgl BETWEEN $1 AND $2 AND is_oos) oos,
      (SELECT count(*) FROM sjp_schedule WHERE tgl BETWEEN $1 AND $2) plan,
      (SELECT count(*) FROM sjp_visit_log WHERE tgl BETWEEN $1 AND $2 AND sched_id IS NOT NULL) done,
      (SELECT count(*) FROM sjp_visit_log v JOIN sjp_lov l ON l.lov_id=v.catatan_lov_id
        WHERE v.tgl BETWEEN $1 AND $2 AND l.kode='LOV-07') ar_follow
  `, [first, last]);

  const trend = await q<any>(`
    SELECT s.tgl::text tgl, count(*) plan,
      (SELECT count(*) FROM sjp_visit_log v WHERE v.tgl=s.tgl AND v.sched_id IS NOT NULL) done
    FROM sjp_schedule s WHERE s.tgl BETWEEN $1 AND $2 GROUP BY s.tgl ORDER BY s.tgl`, [first, last]);

  const sm = await q<any>(`
    SELECT e.emp_id, e.emp_name,
      (SELECT count(*) FROM sjp_schedule s WHERE s.emp_id=e.emp_id AND s.tgl BETWEEN $1 AND $2) plan,
      (SELECT count(*) FROM sjp_visit_log v WHERE v.emp_id=e.emp_id AND v.sched_id IS NOT NULL AND v.tgl BETWEEN $1 AND $2) done
    FROM sjp_employee e WHERE e.is_salesman`, [first, last]);
  const ranked = sm.filter((r) => Number(r.plan) > 0).map((r) => ({ ...r, comp: pct(Number(r.done), Number(r.plan)) })).sort((a, b) => b.comp - a.comp);
  const top = ranked.slice(0, 3);
  const bottom = ranked.slice(-3).reverse();

  const compliance = pct(Number(tot?.done || 0), Number(tot?.plan || 0));
  const effPct = pct(Number(tot?.eff || 0), Number(tot?.visit || 0));

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-extrabold">Recap Bulanan</div>
        <form><input type="month" name="m" defaultValue={m} className="inp !w-40 !py-1 text-sm" /></form>
      </div>
      <div className="text-xs text-mut -mt-1">{BULAN[mm - 1]} {yy}</div>

      <div className="grid grid-cols-2 gap-2">
        <Box label="Compliance" val={`${compliance}%`} sub={`${tot?.done ?? 0}/${tot?.plan ?? 0}`} />
        <Box label="Total Kunjungan" val={tot?.visit ?? 0} sub={`+${tot?.oos ?? 0} OOS`} />
        <Box label="Effective Call" val={`${effPct}%`} sub={`${tot?.eff ?? 0} order`} />
        <Box label="AR Follow-up" val={tot?.ar_follow ?? 0} sub="kunjungan" />
      </div>

      <div className="text-[11px] uppercase tracking-wide text-mut font-bold px-1">Trend Compliance Harian</div>
      <div className="bg-white rounded-xl p-3">
        {trend.length === 0 ? <div className="text-sm text-mut">Belum ada data.</div> : (
          <div className="flex items-end gap-1 h-24">
            {trend.map((t: any) => {
              const c = pct(Number(t.done), Number(t.plan));
              return <div key={t.tgl} className="flex-1 min-w-[6px] relative group" title={`${t.tgl}: ${c}%`}>
                <div className={`rounded-t ${c >= 80 ? "bg-ok" : c >= 50 ? "bg-warn" : "bg-bad"}`} style={{ height: `${Math.max(4, c)}%` }} />
              </div>;
            })}
          </div>
        )}
      </div>

      <div className="text-[11px] uppercase tracking-wide text-mut font-bold px-1">🏆 Top Performer</div>
      <div className="bg-white rounded-xl divide-y divide-line">
        {top.length === 0 ? <div className="p-3 text-sm text-mut">—</div> : top.map((r, i) => (
          <div key={r.emp_id} className="p-3 flex items-center gap-3"><span className="font-bold">{["🥇", "🥈", "🥉"][i]}</span><div className="flex-1 text-sm font-semibold">{r.emp_name}</div><span className="pill p-ok">{r.comp}%</span></div>
        ))}
      </div>

      <div className="text-[11px] uppercase tracking-wide text-mut font-bold px-1">⚠️ Perlu Coaching</div>
      <div className="bg-white rounded-xl divide-y divide-line">
        {bottom.length === 0 ? <div className="p-3 text-sm text-mut">—</div> : bottom.map((r) => (
          <div key={r.emp_id} className="p-3 flex items-center gap-3"><div className="flex-1 text-sm font-semibold">{r.emp_name}</div><span className="pill p-bad">{r.comp}%</span></div>
        ))}
      </div>
    </div>
  );
}

function Box({ label, val, sub }: any) {
  return <div className="bg-white rounded-xl p-3 shadow-sm"><div className="text-[11px] text-mut">{label}</div><div className="text-2xl font-extrabold">{val}</div>{sub ? <div className="text-[10px] text-mut">{sub}</div> : null}</div>;
}
