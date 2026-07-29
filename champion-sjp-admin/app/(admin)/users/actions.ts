"use server";

import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";

export async function addUser(formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const full_name = String(formData.get("full_name") || "").trim() || null;
  const role = String(formData.get("role") || "admin");
  const emp_id = String(formData.get("emp_id") || "").trim() || null;
  if (!username || !password) return;
  // hash bcrypt via pgcrypto
  await q(
    `INSERT INTO sjp_user_login (username, password_hash, full_name, role, emp_id, is_active)
     VALUES ($1, crypt($2, gen_salt('bf')), $3, $4, $5, true)
     ON CONFLICT (username) DO NOTHING`,
    [username, password, full_name, role, emp_id]
  );
  revalidatePath("/users");
}

export async function resetPassword(formData: FormData) {
  const user_id = Number(formData.get("user_id"));
  const password = String(formData.get("password") || "");
  if (!password) return;
  await q(`UPDATE sjp_user_login SET password_hash = crypt($2, gen_salt('bf')) WHERE user_id = $1`, [user_id, password]);
  revalidatePath("/users");
}

export async function toggleUser(formData: FormData) {
  const user_id = Number(formData.get("user_id"));
  await q(`UPDATE sjp_user_login SET is_active = NOT is_active WHERE user_id = $1`, [user_id]);
  revalidatePath("/users");
}
