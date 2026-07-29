"use server";

import { revalidatePath } from "next/cache";
import { q, q1 } from "@/lib/db";

export async function addAssignment(formData: FormData) {
  const cust_code = String(formData.get("cust_code") || "").trim();
  const emp_id = String(formData.get("emp_id") || "").trim();
  const frekuensi = String(formData.get("frekuensi") || "W");
  const minggu_ke = formData.get("minggu_ke") ? Number(formData.get("minggu_ke")) : null;
  let mask = 0;
  for (let i = 0; i < 6; i++) if (formData.get(`hari_${i}`) === "on") mask |= 1 << i;

  if (!cust_code || !emp_id) return { error: "Customer & salesman wajib" };
  const cust = await q1(`SELECT 1 FROM sjp_customer WHERE cust_code = $1`, [cust_code]);
  if (!cust) return { error: `Cust_Code ${cust_code} tidak ditemukan` };

  await q(
    `INSERT INTO sjp_assignment (cust_code, emp_id, frekuensi, hari_mask, minggu_ke, is_active)
     VALUES ($1,$2,$3,$4,$5,true)
     ON CONFLICT (cust_code, emp_id) DO UPDATE SET
       frekuensi=EXCLUDED.frekuensi, hari_mask=EXCLUDED.hari_mask, minggu_ke=EXCLUDED.minggu_ke, is_active=true`,
    [cust_code, emp_id, frekuensi, mask, minggu_ke]
  );
  revalidatePath("/master");
  return { ok: true };
}

export async function deleteAssignment(formData: FormData) {
  const id = Number(formData.get("assign_id"));
  await q(`DELETE FROM sjp_assignment WHERE assign_id = $1`, [id]);
  revalidatePath("/master");
}
