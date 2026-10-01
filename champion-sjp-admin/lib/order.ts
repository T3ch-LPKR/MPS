import type { PoolClient } from "pg";
import { pool } from "./db";

// Validasi + penyimpanan order kunjungan (dipakai /api/visit/submit, edit salesman, edit admin).
// Server TIDAK percaya angka klien: subtotal/diskon/total dihitung ulang di sini.
// Aturan: minimal 1 baris ORDER; qty > 0; ORDER wajib price > 0; BONUS dipaksa price 0;
// duplikat (item_code, item_type) ditolak.

export type OrderItemIn = { item_code: string; item_name: string; item_type: "ORDER" | "BONUS"; qty: number; price: number };
export type OrderIn = { items: OrderItemIn[]; disc_type: "PCT" | "AMT" | null; disc_value: number | null; notes: string | null };

export function parseOrder(raw: any): { order: OrderIn | null; error?: string } {
  if (raw == null) return { order: null };
  const src = Array.isArray(raw?.items) ? raw.items : [];
  const items: OrderItemIn[] = [];
  const seen = new Set<string>();
  for (const r of src) {
    const code = String(r?.item_code || "").trim();
    const name = String(r?.item_name || "").trim();
    const type = r?.item_type === "BONUS" ? "BONUS" : "ORDER";
    const qty = Math.floor(Number(r?.qty) || 0);
    let price = Number(r?.price) || 0;
    if (!code || !name) return { order: null, error: "Item pembelian tidak valid." };
    if (qty <= 0) return { order: null, error: `Qty ${name} harus > 0.` };
    if (type === "BONUS") price = 0;
    else if (price <= 0) return { order: null, error: `Isi harga untuk ${name}.` };
    const key = `${code}|${type}`;
    if (seen.has(key)) return { order: null, error: `${name} (${type}) dobel di daftar.` };
    seen.add(key);
    items.push({ item_code: code, item_name: name, item_type: type, qty, price });
  }
  if (items.length === 0) return { order: null, error: "Isi item pembelian." };
  if (!items.some((i) => i.item_type === "ORDER")) return { order: null, error: "Minimal satu baris bertipe Order." };
  const disc_type = raw?.disc_type === "PCT" || raw?.disc_type === "AMT" ? raw.disc_type : null;
  let disc_value = disc_type ? Math.max(0, Number(raw?.disc_value) || 0) : null;
  if (disc_type === "PCT" && disc_value != null) disc_value = Math.min(disc_value, 100);
  if (!disc_value) disc_value = disc_type ? 0 : null;
  const notes = String(raw?.notes || "").trim() || null;
  return { order: { items, disc_type, disc_value, notes } };
}

export function orderTotals(o: OrderIn) {
  const subtotal = o.items.reduce((a, it) => a + (it.item_type === "ORDER" ? it.qty * it.price : 0), 0);
  const v = o.disc_value || 0;
  const disc_amount = !o.disc_type || v <= 0 ? 0
    : o.disc_type === "PCT" ? Math.min(subtotal, (subtotal * v) / 100)
    : Math.min(subtotal, v);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { subtotal: r2(subtotal), disc_amount: r2(disc_amount), total: r2(subtotal - disc_amount) };
}

/** Insert / replace order untuk satu kunjungan + tulis audit. Jalan dalam transaksi sendiri. */
export async function saveOrder(p: {
  visit_id: number; emp_id: string; cust_code: string | null; prospek_id: string | null;
  tgl: string; order: OrderIn; by: string; action: "CREATE" | "UPDATE";
}) {
  const t = orderTotals(p.order);
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    const h = await client.query(
      `INSERT INTO sjp_visit_order (visit_id, emp_id, cust_code, prospek_id, tgl, notes,
         subtotal, disc_type, disc_value, disc_amount, total, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (visit_id) DO UPDATE SET
         notes=EXCLUDED.notes, subtotal=EXCLUDED.subtotal, disc_type=EXCLUDED.disc_type,
         disc_value=EXCLUDED.disc_value, disc_amount=EXCLUDED.disc_amount, total=EXCLUDED.total,
         updated_at=now(), updated_by=$12
       RETURNING order_id`,
      [p.visit_id, p.emp_id, p.cust_code, p.prospek_id, p.tgl, p.order.notes,
       t.subtotal, p.order.disc_type, p.order.disc_value, t.disc_amount, t.total, p.by]);
    const order_id = h.rows[0].order_id;
    await client.query(`DELETE FROM sjp_visit_order_item WHERE order_id=$1`, [order_id]);
    let line = 0;
    for (const it of p.order.items) {
      line += 1;
      await client.query(
        `INSERT INTO sjp_visit_order_item (order_id, line_no, item_code, item_name, item_type, qty, price, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [order_id, line, it.item_code, it.item_name, it.item_type, it.qty, it.price, it.qty * it.price]);
    }
    await client.query(
      `INSERT INTO sjp_order_audit (order_id, changed_by, action, payload)
       VALUES ($1,$2,$3,$4)`,
      [order_id, p.by, p.action, JSON.stringify({ ...p.order, ...t })]);
    await client.query("COMMIT");
    return order_id as number;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
