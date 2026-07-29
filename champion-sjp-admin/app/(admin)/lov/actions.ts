"use server";

import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";

export async function addLov(formData: FormData) {
  const tipe = String(formData.get("tipe") || "CATATAN");
  const kode = String(formData.get("kode") || "").trim();
  const teks = String(formData.get("teks") || "").trim();
  const kategori = String(formData.get("kategori") || "").trim() || null;
  const perlu_followup = formData.get("perlu_followup") === "on";
  const perlu_approval = formData.get("perlu_approval") === "on";
  if (!kode || !teks) return;
  await q(
    `INSERT INTO sjp_lov (tipe, kode, teks, kategori, perlu_followup, perlu_approval, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,true)
     ON CONFLICT (tipe, kode) DO UPDATE SET teks=EXCLUDED.teks, kategori=EXCLUDED.kategori,
       perlu_followup=EXCLUDED.perlu_followup, perlu_approval=EXCLUDED.perlu_approval`,
    [tipe, kode, teks, kategori, perlu_followup, perlu_approval]
  );
  revalidatePath("/lov");
}

export async function toggleLov(formData: FormData) {
  const id = Number(formData.get("lov_id"));
  await q(`UPDATE sjp_lov SET is_active = NOT is_active WHERE lov_id = $1`, [id]);
  revalidatePath("/lov");
}
