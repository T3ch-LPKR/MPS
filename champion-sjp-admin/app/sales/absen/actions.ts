"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { q, q1 } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getBoolSetting } from "@/lib/settings";
import { uploadPhoto } from "@/lib/storage";

function num(v: FormDataEntryValue | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function decodePhoto(dataUrl: string): Buffer | null {
  if (!dataUrl) return null;
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  try { return Buffer.from(b64, "base64"); } catch { return null; }
}
function wibDateStr(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}

export async function submitAbsen(_prev: any, formData: FormData) {
  const s = await getSession();
  const emp = s?.emp_id;
  if (!emp) return { error: "Akun tidak tertaut salesman." };

  const mode = String(formData.get("mode") || "");
  if (mode !== "MASUK" && mode !== "PULANG") return { error: "Mode absen tidak valid." };

  const lat = num(formData.get("lat"));
  const lng = num(formData.get("lng"));
  const accuracy = num(formData.get("accuracy"));
  const photoBuf = decodePhoto(String(formData.get("photo") || ""));
  const photoMandatory = await getBoolSetting("attendance_photo_mandatory", true);

  if (lat === null || lng === null) return { error: "Lokasi GPS belum terbaca. Aktifkan izin lokasi." };
  if (photoMandatory && !photoBuf) return { error: "Foto selfie wajib untuk absen." };

  if (mode === "PULANG") {
    const masuk = await q1(`SELECT 1 FROM sjp_attendance WHERE emp_id=$1 AND tgl=CURRENT_DATE AND mode='MASUK'`, [emp]);
    if (!masuk) return { error: "Absen masuk dulu sebelum absen pulang." };
  }

  // Upload foto ke Supabase Storage (bila ada). Path: attendance/<emp>/<YYYYMMDD>/<mode>.jpg
  let photo_path: string | null = null;
  if (photoBuf) {
    photo_path = await uploadPhoto(`attendance/${emp}/${wibDateStr()}/${mode}.jpg`, photoBuf);
    if (photoMandatory && !photo_path) return { error: "Gagal mengunggah foto. Coba lagi / cek koneksi." };
  }

  await q(
    `INSERT INTO sjp_attendance (tgl, emp_id, mode, checkin_dt, lat, lng, gps_accuracy, photo_path)
     VALUES (CURRENT_DATE, $1, $2, now(), $3, $4, $5, $6)
     ON CONFLICT (tgl, emp_id, mode)
     DO UPDATE SET checkin_dt=now(), lat=EXCLUDED.lat, lng=EXCLUDED.lng,
                   gps_accuracy=EXCLUDED.gps_accuracy, photo_path=COALESCE(EXCLUDED.photo_path, sjp_attendance.photo_path)`,
    [emp, mode, lat, lng, accuracy, photo_path]);

  revalidatePath("/sales", "layout");
  redirect("/sales/absen");
}
