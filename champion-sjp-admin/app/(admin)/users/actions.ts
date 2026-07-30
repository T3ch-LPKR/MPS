"use server";

import { revalidatePath } from "next/cache";
import { q, q1 } from "@/lib/db";
import { getSession } from "@/lib/session";

function canManageUsers(role?: string) {
  return role === "admin" || role === "superadmin";
}

export async function addUser(_prev: any, formData: FormData) {
  const s = await getSession();
  if (!canManageUsers(s?.role)) return { error: "Tidak berwenang." };

  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const full_name = String(formData.get("full_name") || "").trim() || null;
  let role = String(formData.get("role") || "admin");
  const emp_id = String(formData.get("emp_id") || "").trim() || null;
  if (!username || !password) return { error: "Username & password wajib." };

  // hanya superadmin boleh membuat superadmin
  if (role === "superadmin" && s?.role !== "superadmin") role = "admin";
  if (!["superadmin", "admin", "hos", "salesman"].includes(role)) role = "admin";

  const r = await q(
    `INSERT INTO sjp_user_login (username, password_hash, full_name, role, emp_id, is_active)
     VALUES ($1, crypt($2, gen_salt('bf')), $3, $4, $5, true)
     ON CONFLICT (username) DO NOTHING
     RETURNING user_id`,
    [username, password, full_name, role, emp_id]
  );
  revalidatePath("/users");
  if (r.length === 0) return { error: `Username "${username}" sudah dipakai.` };
  return { ok: true, message: `User ${username} ditambahkan.` };
}

export async function resetPassword(_prev: any, formData: FormData) {
  const s = await getSession();
  if (!canManageUsers(s?.role)) return { error: "Tidak berwenang." };
  const user_id = Number(formData.get("user_id"));
  const password = String(formData.get("password") || "");
  if (!password) return { error: "Isi password baru." };

  const target = await q1<{ role: string }>(`SELECT role FROM sjp_user_login WHERE user_id=$1`, [user_id]);
  // password superadmin hanya boleh diubah oleh superadmin
  if (target?.role === "superadmin" && s?.role !== "superadmin") return { error: "Terkunci." };

  await q(`UPDATE sjp_user_login SET password_hash = crypt($2, gen_salt('bf')) WHERE user_id = $1`, [user_id, password]);
  revalidatePath("/users");
  return { ok: true };
}

export async function toggleUser(formData: FormData) {
  const s = await getSession();
  if (!canManageUsers(s?.role)) return;
  const user_id = Number(formData.get("user_id"));

  const target = await q1<{ role: string }>(`SELECT role FROM sjp_user_login WHERE user_id=$1`, [user_id]);
  // akun superadmin hanya boleh dinonaktifkan oleh superadmin
  if (target?.role === "superadmin" && s?.role !== "superadmin") return;

  await q(`UPDATE sjp_user_login SET is_active = NOT is_active WHERE user_id = $1`, [user_id]);
  revalidatePath("/users");
}
