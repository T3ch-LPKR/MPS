import { NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Perpanjang sesi selama ada aktivitas (sliding). Dipanggil SessionKeeper.
export async function POST() {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  await createSession(s); // re-issue cookie dgn TTL sesuai role
  return NextResponse.json({ ok: true });
}
