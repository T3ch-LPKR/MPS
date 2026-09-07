"use server";

import { headers } from "next/headers";
import { q, q1 } from "./db";
import { createSession, clearSession, getSession, SessionUser } from "./session";

// Catat percobaan login (audit) — backend only, tak ditampilkan di app.
async function logLogin(p: { user_id?: number | null; username: string; role?: string | null; success: boolean; reason?: string }) {
  try {
    const h = headers();
    const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || null;
    const ua = h.get("user-agent") || null;
    await q(
      `INSERT INTO sjp_login_log (user_id, username, role, success, reason, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [p.user_id ?? null, p.username, p.role ?? null, p.success, p.reason ?? null, ip, ua]
    );
  } catch { /* jangan blokir login kalau logging gagal */ }
}

// Batas percobaan login gagal (anti brute-force) per username.
const LOCK_N = 3;      // maks gagal
const LOCK_MIN = 15;   // dalam N menit → lalu terkunci sementara
// Pesan generik: jangan bedakan "user tak ada" vs "password salah" (cegah user enumeration).
const GENERIC_MSG = "Username atau password salah";

// Verifikasi login via bcrypt pgcrypto: password_hash = crypt(input, password_hash)
export async function login(username: string, password: string): Promise<{ ok: boolean; msg?: string }> {
  // Rate-limit: hitung kegagalan terkini utk username ini (pakai sjp_login_log yg sudah ada).
  const recent = await q1<{ n: number }>(
    `SELECT count(*) n FROM sjp_login_log
      WHERE username = $1 AND success = false AND login_at > now() - ($2 || ' minutes')::interval`,
    [username, String(LOCK_MIN)]
  );
  if (Number(recent?.n || 0) >= LOCK_N) {
    await logLogin({ username, success: false, reason: "terkunci sementara" });
    return { ok: false, msg: `Terlalu banyak percobaan gagal. Coba lagi dalam ${LOCK_MIN} menit.` };
  }

  const row = await q1<SessionUser & { valid: boolean; is_active: boolean }>(
    `SELECT user_id, username, full_name, role, emp_id, is_active,
            (password_hash = crypt($2, password_hash)) AS valid
       FROM sjp_user_login WHERE username = $1`,
    [username, password]
  );
  // Urutan cek: user-ada & password → GENERIC (anti enumeration); nonaktif hanya muncul
  // setelah password benar (agar tak membocorkan keberadaan username ke penebak).
  if (!row) { await logLogin({ username, success: false, reason: "user tidak ditemukan" }); return { ok: false, msg: GENERIC_MSG }; }
  if (!row.valid) { await logLogin({ user_id: row.user_id, username: row.username, role: row.role, success: false, reason: "password salah" }); return { ok: false, msg: GENERIC_MSG }; }
  if (!row.is_active) { await logLogin({ user_id: row.user_id, username: row.username, role: row.role, success: false, reason: "nonaktif" }); return { ok: false, msg: "Akun dinonaktifkan. Hubungi admin." }; }

  await q1(`UPDATE sjp_user_login SET last_login = now() WHERE user_id = $1`, [row.user_id]);
  await createSession({
    user_id: row.user_id,
    username: row.username,
    full_name: row.full_name,
    role: row.role,
    emp_id: row.emp_id,
  });
  await logLogin({ user_id: row.user_id, username: row.username, role: row.role, success: true });
  return { ok: true };
}

export async function logout() {
  clearSession();
}

export async function requireUser(): Promise<SessionUser | null> {
  return getSession();
}
