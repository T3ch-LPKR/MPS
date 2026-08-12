"use server";

import { revalidatePath } from "next/cache";
import { q, q1 } from "@/lib/db";
import { getSession } from "@/lib/session";
import { uploadPhoto, removePhotos } from "@/lib/storage";

const ROLES = ["salesman", "hos", "collector"];
const newsPath = (id: number) => `news/${id}.jpg`;

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

  const ins = await q1<{ news_id: number }>(
    `INSERT INTO sjp_news (title, body, start_date, end_date, target_roles, is_active, created_by)
     VALUES ($1,$2,$3,$4,$5,true,$6) RETURNING news_id`,
    [title, body, start_date, end_date, roles, s?.username || "admin"]);
  const id = ins?.news_id;
  if (id && photo) {
    const path = await uploadPhoto(newsPath(id), photo);
    if (path) await q(`UPDATE sjp_news SET photo_path=$2 WHERE news_id=$1`, [id, path]);
    else await q(`UPDATE sjp_news SET photo=$2 WHERE news_id=$1`, [id, photo]); // fallback bytea
  }
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

  // field teks
  await q(`UPDATE sjp_news SET title=$2, body=$3, start_date=$4, end_date=$5, target_roles=$6 WHERE news_id=$1`,
    [id, title, body, start_date, end_date, roles]);

  if (newPhoto) {
    const path = await uploadPhoto(newsPath(id), newPhoto);
    if (path) await q(`UPDATE sjp_news SET photo_path=$2, photo=NULL WHERE news_id=$1`, [id, path]);
    else await q(`UPDATE sjp_news SET photo=$2, photo_path=NULL WHERE news_id=$1`, [id, newPhoto]); // fallback
  } else if (removePhoto) {
    await removePhotos([newsPath(id)]);
    await q(`UPDATE sjp_news SET photo=NULL, photo_path=NULL WHERE news_id=$1`, [id]);
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
  await removePhotos([newsPath(id)]); // hapus objek Storage bila ada
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
