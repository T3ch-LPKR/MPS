import Link from "next/link";
import { q, q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

function ymdToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function Drill({ params, searchParams }: { params: { emp: string }; searchParams: { d?: string } }) {
  const emp = params.emp;
  const d = searchParams.d || ymdToday();
  const e = await q1<any>(`SELECT emp_name FROM sjp_employee WHERE emp_id=$1`, [emp]);

  const plan = await q<any>(`
    SELECT s.sched_id, s.cust_code, c.cust_name, s.jam_target::text jam,
           (v.visit_id IS NOT NULL) AS visited, v.gps_valid, to_char(v.checkin_dt,'HH24:MI') jam_visit
    FROM sjp_schedule s JOIN sjp_customer c ON c.cust_code=s.cust_code
    LEFT JOIN sjp_visit_log v ON v.sched_id=s.sched_id
    WHERE s.emp_id=$1 AND s.tgl=$2 ORDER BY (v.visit_id IS NOT NULL) ASC, c.cust_name ASC`, [emp, d]);

  const oos = await q<any>(`
    SELECT v.visit_id, COALESCE(c.cust_name,p.nama_usaha,v.cust_code,v.prospek_id) nama,
           to_char(v.checkin_dt,'HH24:MI') jam,
           COALESCE((SELECT string_agg(x.teks, ', ') FROM sjp_lov x WHERE x.lov_id = ANY(v.oos_lov_ids)), ol.teks) alasan
    FROM sjp_visit_log v
    LEFT JOIN sjp_customer c ON c.cust_code=v.cust_code
    LEFT JOIN sjp_prospect p ON p.prospek_id=v.prospek_id
    LEFT JOIN sjp_lov ol ON ol.lov_id=v.oos_lov_id
    WHERE v.emp_id=$1 AND v.tgl=$2 AND v.is_oos ORDER BY v.checkin_dt`, [emp, d]);

  const total = plan.length;
  const done = plan.filter((p) => p.visited).length;
  const eff = await q1<any>(`SELECT count(*) n FROM sjp_visit_log WHERE emp_id=$1 AND tgl=$2 AND is_effective_call`, [emp, d]);

  return (
    <div className="p-4 space-y-3">
      <Link href={`/hos?d=${d}`} className="text-brand text-sm">‹ Overview</Link>
      <div className="bg-white rounded-xl p-4">
        <div className="font-extrabold text-lg">{e?.emp_name || emp}</div>
        <div className="text-xs text-mut">{d}</div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1 bg-[#eef0f3] rounded-lg p-2 text-center"><div className="text-lg font-extrabold">{total}</div><div className="text-[10px] text-mut">Plan</div></div>
          <div className="flex-1 bg-[#eef0f3] rounded-lg p-2 text-center"><div className="text-lg font-extrabold text-ok">{done}</div><div className="text-[10px] text-mut">Visit</div></div>
          <div className="flex-1 bg-[#eef0f3] rounded-lg p-2 text-center"><div className="text-lg font-extrabold text-brand">{eff?.n ?? 0}</div><div className="text-[10px] text-mut">Eff.Call</div></div>
          <div className="flex-1 bg-[#eef0f3] rounded-lg p-2 text-center"><div className="text-lg font-extrabold text-info">{oos.length}</div><div className="text-[10px] text-mut">OOS</div></div>
        </div>
      </div>

      <div className="text-[11px] uppercase tracking-wide text-mut font-bold px-1">Jadwal Hari Ini</div>
      <div className="bg-white rounded-xl divide-y divide-line">
        {total === 0 ? <div className="p-3 text-sm text-mut">Tidak ada jadwal.</div> :
          plan.map((p, i) => (
            <div key={p.sched_id} className="p-3 flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full grid place-items-center text-xs font-extrabold text-white ${p.visited ? "bg-ok" : "bg-brand"}`}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{p.cust_name}</div>
                <div className="text-[11px] text-mut">{p.jam ? p.jam.slice(0, 5) + " · " : ""}{p.visited ? `check-in ${p.jam_visit}` : "belum"}</div>
              </div>
              <span className={`pill ${p.visited ? "p-ok" : "p-mut"}`}>{p.visited ? "Selesai" : "Belum"}</span>
            </div>
          ))}
      </div>

      {oos.length ? (
        <>
          <div className="text-[11px] uppercase tracking-wide text-info font-bold px-1">Luar Jadwal ({oos.length})</div>
          <div className="bg-white rounded-xl divide-y divide-line">
            {oos.map((o) => (
              <Link key={o.visit_id} href={`/hos/evidence/${o.visit_id}`} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{o.nama}</div><div className="text-[11px] text-mut">{o.jam} · {o.alasan}</div></div>
                <span className="pill p-info">OOS ›</span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
