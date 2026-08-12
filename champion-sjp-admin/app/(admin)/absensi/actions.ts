"use server";

import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";
import { removePhotos } from "@/lib/storage";

// Hapus foto absensi > 30 hari: hapus objek di Storage + set photo_path NULL (kuota Storage turun).
export async function purgeOldPhotos(_prev: any) {
  const s = await getSession();
  if (!(s?.role === "admin" || s?.role === "superadmin")) return { error: "Tidak berwenang." };

  const rows = await q<{ photo_path: string }>(
    `SELECT photo_path FROM sjp_attendance
      WHERE tgl < CURRENT_DATE - INTERVAL '30 days' AND photo_path IS NOT NULL`);
  const paths = rows.map((r) => r.photo_path).filter(Boolean);
  if (!paths.length) return { ok: true, deleted: 0 };

  const del = await removePhotos(paths);
  await q(`UPDATE sjp_attendance SET photo_path=NULL
            WHERE tgl < CURRENT_DATE - INTERVAL '30 days' AND photo_path IS NOT NULL`);
  revalidatePath("/absensi");
  return { ok: true, deleted: del || paths.length };
}
