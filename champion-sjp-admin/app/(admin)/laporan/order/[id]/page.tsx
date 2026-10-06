import Link from "next/link";
import { redirect } from "next/navigation";
import { q, q1 } from "@/lib/db";
import type { OrderData } from "@/app/sales/OrderItemsSection";
import EditClient from "./EditClient";

export const dynamic = "force-dynamic";

// Edit order oleh admin + riwayat perubahan (audit).
export default async function AdminEditOrderPage({ params }: { params: { id: string } }) {
  const orderId = Number(params.id);
  if (!Number.isInteger(orderId)) redirect("/laporan/order");

  const head = await q1<any>(`
    SELECT o.order_id, o.visit_id, o.tgl::text tgl, o.notes, o.disc_type, o.disc_value,
           e.emp_name, COALESCE(c.cust_name, p.nama_usaha, o.cust_code, o.prospek_id) nama,
           COALESCE(o.cust_code, o.prospek_id) kode,
           o.created_by, o.created_at, o.updated_by, o.updated_at
    FROM sjp_visit_order o
    JOIN sjp_employee e ON e.emp_id = o.emp_id
    LEFT JOIN sjp_customer c ON c.cust_code = o.cust_code
    LEFT JOIN sjp_prospect p ON p.prospek_id = o.prospek_id
    WHERE o.order_id = $1`, [orderId]);
  if (!head) redirect("/laporan/order");

  const items = await q<any>(
    `SELECT item_code, item_name, item_type, qty, price FROM sjp_visit_order_item WHERE order_id=$1 ORDER BY line_no`, [orderId]);
  const audit = await q<any>(
    `SELECT changed_by, to_char(changed_at AT TIME ZONE 'Asia/Jakarta','DD/MM HH24:MI') t, action
     FROM sjp_order_audit WHERE order_id=$1 ORDER BY changed_at DESC LIMIT 20`, [orderId]);

  const initial: OrderData = {
    items: items.map((r: any) => ({
      item_code: r.item_code, item_name: r.item_name, item_type: r.item_type,
      qty: Number(r.qty), price: Number(r.price),
    })),
    disc_type: head.disc_type, disc_value: head.disc_value != null ? Number(head.disc_value) : null,
    notes: head.notes || "",
  };

  return (
    <>
      <div className="mb-1 text-xl font-bold">Edit Order #{orderId}</div>
      <div className="text-sm text-mut mb-3">
        {head.nama} {head.kode ? <span className="font-mono text-ink">({head.kode})</span> : null} · {head.emp_name} · {new Date(head.tgl).toLocaleDateString("id")}
      </div>
      <div className="flex gap-2 mb-4">
        <Link href="/laporan/order" className="btn btn-sm">← Daftar Order</Link>
        <a href={`/api/order/pdf/${orderId}?inline=1`} target="_blank" rel="noreferrer" className="btn btn-sm">🖨 Preview Print</a>
        <a href={`/api/order/pdf/${orderId}`} className="btn btn-sm" download>PDF Surat Pesanan</a>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start">
        <div className="card p-4">
          <EditClient orderId={orderId} initial={initial} />
        </div>
        <div className="card p-4">
          <div className="text-[13px] font-bold mb-2">Riwayat Perubahan</div>
          <div className="text-xs space-y-1.5">
            {audit.map((a: any, i: number) => (
              <div key={i} className="flex justify-between gap-2 border-b border-line/60 pb-1">
                <span className="font-semibold">{a.changed_by}</span>
                <span className="text-mut">{a.action} · {a.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
