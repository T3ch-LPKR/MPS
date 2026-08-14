import Link from "next/link";
import { notFound } from "next/navigation";
import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";
const rp = (n: any) => "Rp " + Number(n || 0).toLocaleString("id");

export default async function Evidence({ params }: { params: { id: string } }) {
  const v = await q1<any>(`
    SELECT v.*, to_char(v.checkin_dt,'DD Mon YYYY HH24:MI') waktu, e.emp_name,
           COALESCE(c.cust_name,p.nama_usaha) nama, c.address,
           l.teks catatan, ol.teks oos_alasan,
           ar.ar_outstanding, lo.last_order_date::text lo_tgl, lo.last_order_amt,
           (v.photo IS NOT NULL OR v.photo_path IS NOT NULL) ada_foto
    FROM sjp_visit_log v
    LEFT JOIN sjp_employee e ON e.emp_id=v.emp_id
    LEFT JOIN sjp_customer c ON c.cust_code=v.cust_code
    LEFT JOIN sjp_prospect p ON p.prospek_id=v.prospek_id
    LEFT JOIN sjp_lov l ON l.lov_id=v.catatan_lov_id
    LEFT JOIN sjp_lov ol ON ol.lov_id=v.oos_lov_id
    LEFT JOIN sjp_customer_ar ar ON ar.cust_code=v.cust_code
    LEFT JOIN sjp_customer_lastorder lo ON lo.cust_code=v.cust_code
    WHERE v.visit_id=$1`, [Number(params.id)]);
  if (!v) notFound();

  return (
    <div className="p-4 space-y-3">
      <Link href="/hos/feed" className="text-brand text-sm">‹ Feed</Link>

      <div className="rounded-xl overflow-hidden bg-[#e5e7eb] aspect-square grid place-items-center">
        {v.ada_foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/photo/${v.visit_id}`} alt="evidence" className="w-full h-full object-cover" />
        ) : <span className="text-5xl text-[#9ca3af]">📷</span>}
      </div>

      <div className="bg-white rounded-xl p-3 space-y-2 text-sm">
        <Row k="Customer" val={v.nama || v.cust_code || v.prospek_id} />
        <Row k="Salesman" val={v.emp_name} />
        <Row k="Waktu" val={v.waktu} />
        <Row k="GPS" val={<span className={v.gps_valid ? "text-ok" : "text-bad"}>{v.gps_valid ? "Valid" : "Di luar radius"}{v.gps_distance_m != null ? ` · ${v.gps_distance_m} m` : ""}{v.gps_accuracy ? ` (±${Math.round(v.gps_accuracy)}m)` : ""}</span>} />
        {v.is_oos ? <Row k="OOS" val={<span className="pill p-info">{v.oos_alasan || "Luar jadwal"}</span>} /> : null}
        <Row k="Catatan" val={v.catatan || "-"} />
        {v.free_text ? <Row k="Free text" val={v.free_text} /> : null}
      </div>

      {(v.ar_outstanding != null || v.lo_tgl) ? (
        <div className="bg-white rounded-xl p-3 space-y-2 text-sm">
          <div className="font-bold text-xs">Konteks Customer</div>
          <Row k="AR Outstanding" val={<span className={Number(v.ar_outstanding) > 0 ? "text-bad font-semibold" : ""}>{rp(v.ar_outstanding)}</span>} />
          <Row k="Order terakhir" val={v.lo_tgl ? `${new Date(v.lo_tgl).toLocaleDateString("id")} · ${rp(v.last_order_amt)}` : "—"} />
        </div>
      ) : null}
    </div>
  );
}

function Row({ k, val }: { k: string; val: any }) {
  return <div className="flex justify-between gap-3 border-b border-line last:border-0 pb-1.5"><span className="text-mut">{k}</span><span className="font-medium text-right">{val}</span></div>;
}
