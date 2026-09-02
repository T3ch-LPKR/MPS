"use server";

import { revalidatePath } from "next/cache";
import { q, q1 } from "@/lib/db";

export async function addAssignment(_prev: any, formData: FormData) {
  const assign_id = formData.get("assign_id") ? Number(formData.get("assign_id")) : null;
  const cust_code = String(formData.get("cust_code") || "").trim();
  const emp_id = String(formData.get("emp_id") || "").trim();
  const frekuensi = String(formData.get("frekuensi") || "W");
  const minggu_ke = formData.get("minggu_ke") ? Number(formData.get("minggu_ke")) : null;
  let mask = 0;
  for (let i = 0; i < 6; i++) if (formData.get(`hari_${i}`) === "on") mask |= 1 << i;

  if (!cust_code || !emp_id) return { error: "Customer & salesman wajib dipilih" };
  const cust = await q1(`SELECT 1 FROM sjp_customer WHERE cust_code = $1`, [cust_code]);
  if (!cust) return { error: `Customer tidak ditemukan` };

  try {
    if (assign_id) {
      // EDIT baris yang sudah ada
      await q(
        `UPDATE sjp_assignment SET cust_code=$2, emp_id=$3, frekuensi=$4, hari_mask=$5,
           minggu_ke=$6, is_active=true WHERE assign_id=$1`,
        [assign_id, cust_code, emp_id, frekuensi, mask, minggu_ke]
      );
    } else {
      await q(
        `INSERT INTO sjp_assignment (cust_code, emp_id, frekuensi, hari_mask, minggu_ke, is_active)
         VALUES ($1,$2,$3,$4,$5,true)
         ON CONFLICT (cust_code, emp_id) DO UPDATE SET
           frekuensi=EXCLUDED.frekuensi, hari_mask=EXCLUDED.hari_mask, minggu_ke=EXCLUDED.minggu_ke, is_active=true`,
        [cust_code, emp_id, frekuensi, mask, minggu_ke]
      );
    }
  } catch (e: any) {
    if (String(e?.code) === "23505") return { error: "Customer ini sudah di-assign ke salesman tersebut." };
    return { error: "Gagal menyimpan." };
  }
  revalidatePath("/master");
  return { ok: true, edited: !!assign_id, emp_id };
}

export async function deleteAssignment(formData: FormData) {
  const id = Number(formData.get("assign_id"));
  await q(`DELETE FROM sjp_assignment WHERE assign_id = $1`, [id]);
  revalidatePath("/master");
}
