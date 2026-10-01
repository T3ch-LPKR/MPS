"use server";

import { q1 } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseOrder, saveOrder } from "@/lib/order";

// Koreksi order oleh admin — kapan pun, tercatat di sjp_order_audit (changed_by = username admin).
export async function updateOrderAdmin(orderId: number, raw: any): Promise<{ ok?: boolean; error?: string }> {
  const s = await getSession();
  if (!s || !["admin", "superadmin"].includes(s.role)) return { error: "Tidak berwenang." };
  const row = await q1<any>(
    `SELECT visit_id, emp_id, cust_code, prospek_id, tgl::text tgl FROM sjp_visit_order WHERE order_id = $1`, [orderId]);
  if (!row) return { error: "Order tidak ditemukan." };

  const { order, error } = parseOrder(raw);
  if (!order) return { error: error || "Data order tidak valid." };
  await saveOrder({
    visit_id: row.visit_id, emp_id: row.emp_id, cust_code: row.cust_code, prospek_id: row.prospek_id,
    tgl: row.tgl, order, by: s.username, action: "UPDATE",
  });
  return { ok: true };
}
