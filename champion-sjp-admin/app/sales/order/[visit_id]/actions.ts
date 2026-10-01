"use server";

import { q1 } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseOrder, saveOrder } from "@/lib/order";

// Salesman koreksi ordernya sendiri — HANYA di hari yang sama (WIB). Tercatat di audit.
export async function updateOrderSales(visitId: number, raw: any): Promise<{ ok?: boolean; error?: string }> {
  const s = await getSession();
  if (!s?.emp_id) return { error: "Sesi tidak valid." };
  const row = await q1<any>(
    `SELECT o.order_id, o.emp_id, o.cust_code, o.prospek_id, o.tgl::text tgl,
            (o.tgl = (now() AT TIME ZONE 'Asia/Jakarta')::date) AS editable
     FROM sjp_visit_order o WHERE o.visit_id = $1`, [visitId]);
  if (!row) return { error: "Order tidak ditemukan." };
  if (row.emp_id !== s.emp_id) return { error: "Bukan order Anda." };
  if (!row.editable) return { error: "Order hanya bisa diubah di hari yang sama." };

  const { order, error } = parseOrder(raw);
  if (!order) return { error: error || "Data order tidak valid." };
  await saveOrder({
    visit_id: visitId, emp_id: row.emp_id, cust_code: row.cust_code, prospek_id: row.prospek_id,
    tgl: row.tgl, order, by: s.username, action: "UPDATE",
  });
  return { ok: true };
}
