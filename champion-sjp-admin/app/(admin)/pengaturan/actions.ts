"use server";

import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function saveSettings(formData: FormData) {
  const s = await getSession();
  if (!(s?.role === "admin" || s?.role === "superadmin")) return;
  const photoMandatory = formData.get("photo_mandatory") === "on" ? "true" : "false";
  await q(
    `INSERT INTO sjp_setting (skey, svalue, updated_at) VALUES ('photo_mandatory',$1,now())
     ON CONFLICT (skey) DO UPDATE SET svalue=EXCLUDED.svalue, updated_at=now()`,
    [photoMandatory]
  );
  revalidatePath("/pengaturan");
}
