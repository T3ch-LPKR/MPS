import Link from "next/link";
import { notFound } from "next/navigation";
import { q, q1 } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getBoolSetting } from "@/lib/settings";
import CheckinForm from "../../CheckinForm";

export const dynamic = "force-dynamic";

const rp = (n: any) => "Rp " + Number(n || 0).toLocaleString("id");

// Ikon pin Google Maps (inline SVG multi-warna Google) — tanpa aset eksternal.
function GmapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M12 2c-3.9 0-7 3.1-7 7 0 1.4.4 2.6 1 3.7L12 22l6-9.3c.6-1.1 1-2.3 1-3.7 0-3.9-3.1-7-7-7z" />
      <path fill="#34A853" d="M6 12.7 12 22l3.2-5c-.9.6-2 1-3.2 1-2.6 0-4.8-1.7-5.6-4a7 7 0 0 0 .6.7z" opacity=".85" />
      <path fill="#FBBC04" d="M5 8.6C5.5 6 7.5 4 10 3.3 8 4.2 6.6 6 6.1 8.2c-.4 1.6-.2 2.9.3 4.1a7 7 0 0 1-1.4-3.7z" opacity=".9" />
      <path fill="#EA4335" d="M12 2c1.9 0 3.6.8 4.9 2C15.7 2.7 14 2 12 2 9.5 2.7 7.5 4.7 7 7.3 7.8 4.5 9.7 2.6 12 2z" opacity=".9" />
      <circle cx="12" cy="9" r="2.5" fill="#fff" />
    </svg>
  );
}

function gmapsUrl(lat: any, lng: any, address?: string | null, name?: string) {
  if (lat != null && lng != null)
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const q = encodeURIComponent(address || name || "");
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export default async function KunjunganDetail({ params }: { params: { id: string } }) {
  const user = await getSession();
  const emp = user?.emp_id || "";
  const sched = await q1<any>(`
    SELECT s.sched_id, s.cust_code, s.status, c.cust_name, c.address, c.phone,
           g.lat, g.lng
    FROM sjp_schedule s JOIN sjp_customer c ON c.cust_code=s.cust_code
    LEFT JOIN sjp_customer_geo g ON g.cust_code=s.cust_code
    WHERE s.sched_id=$1 AND s.emp_id=$2`, [Number(params.id), emp]);
  if (!sched) notFound();

  const ar = await q1<any>(`SELECT ar_outstanding, ar_overdue, invoice_count FROM sjp_customer_ar WHERE cust_code=$1`, [sched.cust_code]);
  const arDet = await q<any>(`SELECT trans_no, trans_date::text tgl, balance, aging_bucket, overdue_days FROM sjp_customer_ar_detail WHERE cust_code=$1 ORDER BY overdue_days DESC LIMIT 6`, [sched.cust_code]);
  const lo = await q1<any>(`SELECT last_order_date::text tgl, last_order_inv, last_order_amt, items_json FROM sjp_customer_lastorder WHERE cust_code=$1`, [sched.cust_code]);
  const lov = await q<any>(`SELECT lov_id, kode, teks FROM sjp_lov WHERE tipe='CATATAN' AND is_active ORDER BY kode`);
  const photoMandatory = await getBoolSetting("photo_mandatory", true);

  const items = Array.isArray(lo?.items_json) ? lo.items_json : [];

  return (
    <div className="p-4 space-y-3">
      <Link href="/sales" className="text-brand text-sm">‹ Kembali ke plan</Link>
      <div className="card p-4">
        <div className="font-extrabold text-lg">{sched.cust_name}</div>
        <div className="text-xs text-mut mt-0.5">📍 {sched.address || "-"}</div>
        {sched.phone ? <div className="text-xs text-mut">☎ {sched.phone}</div> : null}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <a href={gmapsUrl(sched.lat, sched.lng, sched.address, sched.cust_name)} target="_blank" rel="noreferrer"
            className="btn btn-sm inline-flex items-center gap-1.5">
            <GmapIcon /> Arahkan
          </a>
          {sched.lat == null ? <span className="text-[11px] text-mut">navigasi via alamat</span> : null}
        </div>
        {sched.lat == null ? <div className="mt-1"><span className="pill p-mut">Belum ada titik GPS — check-in pertama jadi patokan</span></div> : null}
      </div>

      {/* Konteks: AR + last order */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3 text-white" style={{ background: "linear-gradient(135deg,#dc2626,#a3161b)" }}>
          <div className="text-[11px] opacity-90">AR Outstanding</div>
          <div className="text-lg font-extrabold">{rp(ar?.ar_outstanding)}</div>
          <div className="text-[10px] opacity-90">{ar?.invoice_count || 0} invoice{Number(ar?.ar_overdue) > 0 ? ` · overdue ${rp(ar.ar_overdue)}` : ""}</div>
        </div>
        <div className="rounded-xl p-3 text-white" style={{ background: "linear-gradient(135deg,#2563eb,#1e40af)" }}>
          <div className="text-[11px] opacity-90">Order Terakhir</div>
          <div className="text-lg font-extrabold">{lo?.tgl ? new Date(lo.tgl).toLocaleDateString("id") : "—"}</div>
          <div className="text-[10px] opacity-90">{lo ? rp(lo.last_order_amt) : "belum ada"}</div>
        </div>
      </div>

      {arDet.length ? (
        <div className="card p-3">
          <div className="font-bold text-xs mb-1">💳 Rincian AR</div>
          {arDet.map((d: any, i: number) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b border-line last:border-0">
              <span className="text-mut">{d.trans_no} · {d.aging_bucket}{d.overdue_days ? ` (${d.overdue_days}h)` : ""}</span>
              <span className="font-semibold">{rp(d.balance)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {items.length ? (
        <div className="card p-3">
          <div className="font-bold text-xs mb-1">📦 Item order terakhir{lo?.last_order_inv ? ` · ${lo.last_order_inv}` : ""}</div>
          {items.slice(0, 6).map((it: any, i: number) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b border-dashed border-line last:border-0">
              <span>{it.item_name || it.item_code}</span>
              <span className="text-mut">{it.qty} × {rp(it.price)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Check-in */}
      <div className="card p-4">
        <div className="font-bold mb-2">Check-in Kunjungan</div>
        {sched.status === "DONE" ? (
          <div className="text-sm text-ok">✓ Sudah check-in hari ini.</div>
        ) : (
          <CheckinForm
            schedId={sched.sched_id}
            custCode={sched.cust_code}
            custName={sched.cust_name}
            custLat={sched.lat != null ? Number(sched.lat) : null}
            custLng={sched.lng != null ? Number(sched.lng) : null}
            catatanLov={lov}
            photoMandatory={photoMandatory}
          />
        )}
      </div>
    </div>
  );
}
