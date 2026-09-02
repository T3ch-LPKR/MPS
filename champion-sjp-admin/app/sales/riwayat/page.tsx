import { q } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Riwayat() {
  const user = await getSession();
  const emp = user?.emp_id || "";
  const rows = emp ? await q<any>(`
    SELECT v.visit_id, v.tgl::text tgl, to_char(v.checkin_dt,'HH24:MI') jam,
           COALESCE(c.cust_name, p.nama_usaha, v.cust_code, v.prospek_id) AS nama,
           v.is_oos, v.gps_valid, v.gps_distance_m, v.free_text, v.ar_collect, v.ar_amount,
           COALESCE((SELECT string_agg(x.teks, ', ') FROM sjp_lov x WHERE x.lov_id = ANY(v.catatan_lov_ids)), l.teks) AS catatan,
           COALESCE((SELECT string_agg(x.teks, ', ') FROM sjp_lov x WHERE x.lov_id = ANY(v.oos_lov_ids)), ol.teks) AS oos_alasan,
           (v.photo IS NOT NULL OR v.photo_path IS NOT NULL) AS ada_foto
    FROM sjp_visit_log v
    LEFT JOIN sjp_customer c ON c.cust_code=v.cust_code
    LEFT JOIN sjp_prospect p ON p.prospek_id=v.prospek_id
    LEFT JOIN sjp_lov l ON l.lov_id=v.catatan_lov_id
    LEFT JOIN sjp_lov ol ON ol.lov_id=v.oos_lov_id
    WHERE v.emp_id=$1
    ORDER BY v.checkin_dt DESC LIMIT 50`, [emp]) : [];

  return (
    <div className="p-4 space-y-2">
      <div className="text-lg font-extrabold mb-1">Riwayat Kunjungan</div>
      {rows.length === 0 ? (
        <div className="card p-4 text-sm text-mut text-center">Belum ada kunjungan tercatat.</div>
      ) : rows.map((r) => (
        <div key={r.visit_id} className="card p-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm">{r.nama}</div>
            <div className="flex gap-1">
              {r.is_oos ? <span className="pill p-info">OOS</span> : null}
              <span className={`pill ${r.gps_valid ? "p-ok" : "p-bad"}`}>{r.gps_valid ? "GPS valid" : "GPS luar"}</span>
            </div>
          </div>
          <div className="text-[11px] text-mut mt-0.5">
            {new Date(r.tgl).toLocaleDateString("id")} {r.jam}
            {r.gps_distance_m != null ? ` · ${r.gps_distance_m} m` : ""} {r.ada_foto ? "· 📷" : ""}
          </div>
          <div className="text-xs mt-1">
            {r.oos_alasan ? <span className="text-info">{r.oos_alasan} · </span> : null}
            <span className="font-medium">{r.catatan}</span>
            {r.free_text ? <span className="text-mut"> — {r.free_text}</span> : null}
          </div>
          {r.ar_collect ? (
            <div className="mt-1">
              <span className="pill p-ok">💳 AR {r.ar_collect === "FULL" ? "Lunas" : "Sebagian"} · Rp {Number(r.ar_amount || 0).toLocaleString("id")}</span>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
