import Link from "next/link";
import { redirect } from "next/navigation";
import { q, q1 } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { OrderData } from "../../OrderItemsSection";
import EditClient from "./EditClient";

export const dynamic = "force-dynamic";

// Edit order oleh salesman — hanya order miliknya & hanya di hari yang sama (WIB).
export default async function EditOrderPage({ params }: { params: { visit_id: string } }) {
  const s = await getSession();
  const visitId = Number(params.visit_id);
  if (!s?.emp_id || !Number.isInteger(visitId)) redirect("/sales/riwayat");

  const head = await q1<any>(
    `SELECT o.order_id, o.emp_id, o.notes, o.disc_type, o.disc_value, o.tgl::text tgl,
            (o.tgl = (now() AT TIME ZONE 'Asia/Jakarta')::date) AS editable,
            COALESCE(c.cust_name, p.nama_usaha, o.cust_code, o.prospek_id) nama
     FROM sjp_visit_order o
     LEFT JOIN sjp_customer c ON c.cust_code = o.cust_code
     LEFT JOIN sjp_prospect p ON p.prospek_id = o.prospek_id
     WHERE o.visit_id = $1`, [visitId]);
  if (!head || head.emp_id !== s.emp_id) redirect("/sales/riwayat");

  const items = await q<any>(
    `SELECT item_code, item_name, item_type, qty, price
     FROM sjp_visit_order_item WHERE order_id = $1 ORDER BY line_no`, [head.order_id]);
  const initial: OrderData = {
    items: items.map((r: any) => ({
      item_code: r.item_code, item_name: r.item_name,
      item_type: r.item_type, qty: Number(r.qty), price: Number(r.price),
    })),
    disc_type: head.disc_type, disc_value: head.disc_value != null ? Number(head.disc_value) : null,
    notes: head.notes || "",
  };

  return (
    <div className="p-4 space-y-3">
      <div>
        <Link href="/sales/riwayat" className="text-xs text-brand underline">← Riwayat</Link>
        <div className="text-lg font-extrabold mt-1">Edit Order</div>
        <div className="text-xs text-mut">{head.nama} · {new Date(head.tgl).toLocaleDateString("id")}</div>
      </div>
      {head.editable ? (
        <EditClient visitId={visitId} initial={initial} backHref="/sales/riwayat" />
      ) : (
        <div className="card p-4 text-sm text-mut">Order hanya bisa diubah di hari yang sama. Hubungi admin untuk koreksi.</div>
      )}
    </div>
  );
}
