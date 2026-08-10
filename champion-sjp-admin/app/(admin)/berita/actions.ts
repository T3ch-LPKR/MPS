"use server";

import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";

const ROLES = ["salesman", "hos", "collector"];

function decodePhoto(dataUrl: string): Buffer | null {
  if (!dataUrl) return null;
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  try { return Buffer.from(b64, "base64"); } catch { return null; }
}

export async function createNews(_prev: any, formData: FormData) {
  const s = await getSession();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim() || null;
  const start_date = String(formData.get("start_date") || "").trim();
  const end_date = String(formData.get("end_date") || "").trim();
  const roles = formData.getAll("roles").map(String).filter((r) => ROLES.includes(r));
  const photo = decodePhoto(String(formData.get("photo") || ""));

  if (!title) return { error: "Judul wajib diisi." };
  if (!start_date || !end_date) return { error: "Periode (mulai & selesai) wajib diisi." };
  if (end_date < start_date) return { error: "Tanggal selesai tidak boleh sebelum mulai." };
  if (roles.length === 0) return { error: "Pilih minimal satu target (Salesman/HOS/Collector)." };

  await q(
    `INSERT INTO sjp_news (title, body, photo, start_date, end_date, target_roles, is_active, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,true,$7)`,
    [title, body, photo, start_date, end_date, roles, s?.username || "admin"]);
  revalidatePath("/berita");
  return { ok: true };
}

export async function updateNews(_prev: any, formData: FormData) {
  const id = Number(formData.get("news_id"));
  if (!id) return { error: "Berita tidak valid." };
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim() || null;
  const start_date = String(formData.get("start_date") || "").trim();
  const end_date = String(formData.get("end_date") || "").trim();
  const roles = formData.getAll("roles").map(String).filter((r) => ROLES.includes(r));
  const newPhoto = decodePhoto(String(formData.get("photo") || ""));
  const removePhoto = formData.get("remove_photo") === "1";

  if (!title) return { error: "Judul wajib diisi." };
  if (!start_date || !end_date) return { error: "Periode (mulai & selesai) wajib diisi." };
  if (end_date < start_date) return { error: "Tanggal selesai tidak boleh sebelum mulai." };
  if (roles.length === 0) return { error: "Pilih minimal satu target (Salesman/HOS/Collector)." };

  if (newPhoto) {
    await q(`UPDATE sjp_news SET title=$2, body=$3, start_date=$4, end_date=$5, target_roles=$6, photo=$7 WHERE news_id=$1`,
      [id, title, body, start_date, end_date, roles, newPhoto]);
  } else if (removePhoto) {
    await q(`UPDATE sjp_news SET title=$2, body=$3, start_date=$4, end_date=$5, target_roles=$6, photo=NULL WHERE news_id=$1`,
      [id, title, body, start_date, end_date, roles]);
  } else {
    await q(`UPDATE sjp_news SET title=$2, body=$3, start_date=$4, end_date=$5, target_roles=$6 WHERE news_id=$1`,
      [id, title, body, start_date, end_date, roles]);
  }
  revalidatePath("/berita");
  return { ok: true };
}

export async function toggleNews(formData: FormData) {
  const id = Number(formData.get("news_id"));
  if (!id) return;
  await q(`UPDATE sjp_news SET is_active = NOT is_active WHERE news_id=$1`, [id]);
  revalidatePath("/berita");
}

export async function deleteNews(formData: FormData) {
  const id = Number(formData.get("news_id"));
  if (!id) return;
  await q(`DELETE FROM sjp_news_read WHERE news_id=$1`, [id]);
  await q(`DELETE FROM sjp_news WHERE news_id=$1`, [id]);
  revalidatePath("/berita");
}

// Reset "dibaca" 1 berita -> semua user jadi unread lagi (popup + badge muncul lagi)
export async function resetNewsRead(formData: FormData) {
  const id = Number(formData.get("news_id"));
  if (!id) return;
  await q(`DELETE FROM sjp_news_read WHERE news_id=$1`, [id]);
  revalidatePath("/berita");
}
