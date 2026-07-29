"use server";

import { revalidatePath } from "next/cache";
import { q, q1 } from "@/lib/db";

export async function linkProspek(formData: FormData) {
  const id = String(formData.get("prospek_id"));
  const cust = String(formData.get("cust_code") || "").trim();
  if (!cust) return;
  const ok = await q1(`SELECT 1 FROM sjp_customer WHERE cust_code=$1`, [cust]);
  if (!ok) return;
  await q(`UPDATE sjp_prospect SET status='TAUTKAN', linked_cust_code=$2 WHERE prospek_id=$1`, [id, cust]);
  revalidatePath("/prospek");
}

export async function arsipProspek(formData: FormData) {
  const id = String(formData.get("prospek_id"));
  await q(`UPDATE sjp_prospect SET status='ARSIP' WHERE prospek_id=$1`, [id]);
  revalidatePath("/prospek");
}
