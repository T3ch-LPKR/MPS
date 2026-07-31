import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "sjp_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev_secret_change_me_min_32_characters_long"
);

export type SessionUser = {
  user_id: number;
  username: string;
  full_name: string | null;
  role: "superadmin" | "admin" | "hos" | "salesman";
  emp_id: string | null;
};

// TTL default per role: admin/hos/superadmin = 60 menit (idle sliding),
// salesman = 12 jam (lapangan, jangan putus di tengah kunjungan).
export function ttlForRole(role: SessionUser["role"]): number {
  return role === "salesman" ? 12 * 3600 : 60 * 60;
}

export async function createSession(user: SessionUser, ttlSec?: number) {
  const ttl = ttlSec ?? ttlForRole(user.role);
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secret);
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttl,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  cookies().delete(COOKIE);
}

// dipakai middleware (edge) — verifikasi token dari string cookie
export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = COOKIE;
