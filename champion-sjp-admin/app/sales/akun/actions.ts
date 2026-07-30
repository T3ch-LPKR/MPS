"use server";

import { q, q1 } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function changeOwnPassword(_prev: any, formData: FormData) {
  const s = await getSession();
  if (!s) return { error: "Sesi habis, login ulang." };
  const oldp = String(formData.get("old") || "");
  const np = String(formData.get("new") || "");
  const np2 = String(formData.get("new2") || "");
  if (!oldp || !np) return { error: "Isi password lama & baru." };
  if (np.length < 4) return { error: "Password baru minimal 4 karakter." };
  if (np !== np2) return { error: "Konfirmasi password tidak sama." };

  const row = await q1<{ ok: boolean }>(
    `SELECT (password_hash = crypt($2, password_hash)) AS ok FROM sjp_user_login WHERE user_id=$1`,
    [s.user_id, oldp]
  );
  if (!row?.ok) return { error: "Password lama salah." };

  await q(`UPDATE sjp_user_login SET password_hash = crypt($2, gen_salt('bf')) WHERE user_id=$1`, [s.user_id, np]);
  return { ok: true };
}
