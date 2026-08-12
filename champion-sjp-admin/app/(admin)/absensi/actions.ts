"use server";

import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";
import { removePhotos } from "@/lib/storage";

// Hapus foto ABSENSI + KUNJUNGAN > 30 hari: hapus objek di Storage + set photo_path NULL
// (kuota Storage benar-benar turun). Data (jam/lokasi/catatan) tetap tersimpan.
export async function purgeOldPhotos(_prev: any) {
  const s = await getSession();
  if (!(s?.role === "admin" || s?.role === "superadmin")) return { error: "Tidak berwenang." };

  const att = await q<{ photo_path: string }>(
    `SELECT photo_path FROM sjp_attendance
      WHERE tgl < CURRENT_DATE - INTERVAL '30 days' AND photo_path IS NOT NULL`);
  const vis = await q<{ photo_path: string }>(
    `SELECT photo_path FROM sjp_visit_log
      WHERE tgl < CURRENT_DATE - INTERVAL '30 days' AND photo_path IS NOT NULL`);
  const paths = [...att, ...vis].map((r) => r.photo_path).filter(Boolean);
  if (!paths.length) return { ok: true, deleted: 0 };

  const del = await removePhotos(paths);
  await q(`UPDATE sjp_attendance SET photo_path=NULL
            WHERE tgl < CURRENT_DATE - INTERVAL '30 days' AND photo_path IS NOT NULL`);
  await q(`UPDATE sjp_visit_log SET photo_path=NULL
            WHERE tgl < CURRENT_DATE - INTERVAL '30 days' AND photo_path IS NOT NULL`);
  revalidatePath("/absensi");
  return { ok: true, deleted: del || paths.length };
}
