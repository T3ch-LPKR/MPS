import Link from "next/link";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Feed() {
  const rows = await q<any>(`
    SELECT v.visit_id, to_char(v.checkin_dt,'DD Mon HH24:MI') waktu, e.emp_name,
           COALESCE(c.cust_name,p.nama_usaha,v.cust_code,v.prospek_id) nama,
           v.is_oos, v.gps_valid, v.gps_distance_m,
           COALESCE((SELECT string_agg(x.teks, ', ') FROM sjp_lov x WHERE x.lov_id = ANY(v.catatan_lov_ids)), l.teks) catatan,
           (v.photo IS NOT NULL OR v.photo_path IS NOT NULL) ada_foto
    FROM sjp_visit_log v
    LEFT JOIN sjp_employee e ON e.emp_id=v.emp_id
    LEFT JOIN sjp_customer c ON c.cust_code=v.cust_code
    LEFT JOIN sjp_prospect p ON p.prospek_id=v.prospek_id
    LEFT JOIN sjp_lov l ON l.lov_id=v.catatan_lov_id
    ORDER BY v.checkin_dt DESC LIMIT 50`);

  return (
    <div className="p-4 space-y-2">
      <div className="text-lg font-extrabold mb-1">Feed Kunjungan</div>
      <div className="text-xs text-mut mb-2">Evidence terbaru semua salesman</div>
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl p-4 text-sm text-mut text-center">Belum ada kunjungan. Muncul setelah salesman check-in.</div>
      ) : rows.map((r) => (
        <Link key={r.visit_id} href={`/hos/evidence/${r.visit_id}`} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-[#e5e7eb] grid place-items-center overflow-hidden flex-shrink-0">
            {r.ada_foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/photo/${r.visit_id}`} alt="" className="w-full h-full object-cover" />
            ) : <span className="text-xl text-[#9ca3af]">📷</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{r.nama}</div>
            <div className="text-[11px] text-mut truncate">{r.emp_name} · {r.waktu}</div>
            <div className="text-[11px] mt-0.5">
              {r.is_oos ? <span className="pill p-info mr-1">OOS</span> : null}
              <span className="text-mut">{r.catatan || "-"}</span>
            </div>
          </div>
          <span className={`pill ${r.gps_valid ? "p-ok" : "p-bad"}`}>{r.gps_valid ? "Valid" : "Luar"}</span>
        </Link>
      ))}
    </div>
  );
}
