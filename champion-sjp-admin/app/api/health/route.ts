import { NextResponse } from "next/server";
import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

// Keep-warm: dipanggil cron eksternal (mis. tiap 10 menit) agar serverless + DB tidak "dingin"/auto-pause.
// Ringan: 1 query trivial. Tanpa auth, tanpa data sensitif.
export async function GET() {
  try {
    await q1<{ ok: number }>("SELECT 1 AS ok");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
