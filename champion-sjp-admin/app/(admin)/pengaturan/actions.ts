"use server";

import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";

const KEYS = [
  "photo_mandatory",
  "attendance_masuk_mandatory",
  "attendance_pulang_mandatory",
  "attendance_photo_mandatory",
];

export async function saveSettings(formData: FormData) {
  const s = await getSession();
  if (!(s?.role === "admin" || s?.role === "superadmin")) return;
  for (const k of KEYS) {
    const v = formData.get(k) === "on" ? "true" : "false";
    await q(
      `INSERT INTO sjp_setting (skey, svalue, updated_at) VALUES ($1,$2,now())
       ON CONFLICT (skey) DO UPDATE SET svalue=EXCLUDED.svalue, updated_at=now()`,
      [k, v]);
  }
  revalidatePath("/pengaturan");
}
