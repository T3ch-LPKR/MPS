"use server";

import { q1 } from "./db";
import { createSession, clearSession, getSession, SessionUser } from "./session";

// Verifikasi login via bcrypt pgcrypto: password_hash = crypt(input, password_hash)
export async function login(username: string, password: string): Promise<{ ok: boolean; msg?: string }> {
  const row = await q1<SessionUser & { valid: boolean; is_active: boolean }>(
    `SELECT user_id, username, full_name, role, emp_id, is_active,
            (password_hash = crypt($2, password_hash)) AS valid
       FROM sjp_user_login WHERE username = $1`,
    [username, password]
  );
  if (!row) return { ok: false, msg: "User tidak ditemukan" };
  if (!row.is_active) return { ok: false, msg: "User nonaktif" };
  if (!row.valid) return { ok: false, msg: "Password salah" };

  await q1(`UPDATE sjp_user_login SET last_login = now() WHERE user_id = $1`, [row.user_id]);
  await createSession({
    user_id: row.user_id,
    username: row.username,
    full_name: row.full_name,
    role: row.role,
    emp_id: row.emp_id,
  });
  return { ok: true };
}

export async function logout() {
  clearSession();
}

export async function requireUser(): Promise<SessionUser | null> {
  return getSession();
}
