import { q, q1 } from "@/lib/db";
import MapClient from "./MapClient";

export const dynamic = "force-dynamic";
function ymdToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

export default async function Peta({ searchParams }: { searchParams: { emp?: string; d?: string } }) {
  const d = searchParams.d || ymdToday();
  const salesmen = await q<any>(`SELECT emp_id, emp_name FROM sjp_employee WHERE is_salesman ORDER BY emp_name`);
  let emp = (searchParams.emp || "").trim();
  if (!emp) {
    const f = await q1<any>(`SELECT emp_id FROM sjp_visit_log WHERE tgl=$1 AND lat IS NOT NULL ORDER BY checkin_dt LIMIT 1`, [d]);
    emp = f?.emp_id || salesmen[0]?.emp_id || "";
  }

  // titik kunjungan (sudah check-in)
  const visited = await q<any>(`
    SELECT v.lat, v.lng, COALESCE(c.cust_name,p.nama_usaha,v.cust_code,v.prospek_id) label
    FROM sjp_visit_log v
    LEFT JOIN sjp_customer c ON c.cust_code=v.cust_code
    LEFT JOIN sjp_prospect p ON p.prospek_id=v.prospek_id
    WHERE v.emp_id=$1 AND v.tgl=$2 AND v.lat IS NOT NULL ORDER BY v.checkin_dt`, [emp, d]);

  // titik terjadwal yang belum dikunjungi (punya geo)
  const planned = await q<any>(`
    SELECT g.lat, g.lng, c.cust_name label
    FROM sjp_schedule s JOIN sjp_customer c ON c.cust_code=s.cust_code
    JOIN sjp_customer_geo g ON g.cust_code=s.cust_code
    LEFT JOIN sjp_visit_log v ON v.sched_id=s.sched_id
    WHERE s.emp_id=$1 AND s.tgl=$2 AND v.visit_id IS NULL`, [emp, d]);

  const points = [
    ...visited.map((r: any) => ({ lat: Number(r.lat), lng: Number(r.lng), label: r.label, type: "done" as const })),
    ...planned.map((r: any) => ({ lat: Number(r.lat), lng: Number(r.lng), label: r.label, type: "plan" as const })),
  ];

  return (
    <div className="p-4 space-y-3">
      <div className="text-lg font-extrabold">Peta Rute</div>
      <form className="flex gap-2">
        <select name="emp" defaultValue={emp} className="inp !py-1.5 text-sm flex-1">
          {salesmen.map((s: any) => <option key={s.emp_id} value={s.emp_id}>{s.emp_name}</option>)}
        </select>
        <input type="date" name="d" defaultValue={d} className="inp !py-1.5 text-sm !w-36" />
        <button className="btn btn-sm">Tampilkan</button>
      </form>

      {points.length === 0 ? (
        <div className="bg-white rounded-xl p-4 text-sm text-mut text-center">Belum ada titik untuk salesman/hari ini (butuh koordinat customer atau check-in).</div>
      ) : <MapClient points={points} />}

      <div className="flex gap-3 text-xs text-mut justify-center">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-ok inline-block"></span> Sudah check-in</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-brand inline-block"></span> Terjadwal</span>
      </div>
    </div>
  );
}
