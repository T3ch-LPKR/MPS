import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Tandai 1 berita sudah dibaca oleh user (popup tak muncul lagi).
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s?.user_id) return NextResponse.json({ ok: false }, { status: 401 });
  const { news_id } = await req.json().catch(() => ({ news_id: null }));
  const id = Number(news_id);
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await q(
    `INSERT INTO sjp_news_read (news_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [id, s.user_id]);
  return NextResponse.json({ ok: true });
}
