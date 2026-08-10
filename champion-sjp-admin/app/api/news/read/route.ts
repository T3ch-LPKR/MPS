import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Tandai berita sudah dibaca oleh user (popup tak muncul lagi). Terima news_id tunggal ATAU news_ids[].
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s?.user_id) return NextResponse.json({ ok: false }, { status: 401 });
  const body: any = await req.json().catch(() => ({}));
  const ids: number[] = Array.isArray(body?.news_ids)
    ? body.news_ids.map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x) && x > 0)
    : (Number(body?.news_id) > 0 ? [Number(body.news_id)] : []);
  if (!ids.length) return NextResponse.json({ ok: false }, { status: 400 });
  await q(
    `INSERT INTO sjp_news_read (news_id, user_id)
     SELECT unnest($1::bigint[]), $2 ON CONFLICT DO NOTHING`,
    [ids, s.user_id]);
  return NextResponse.json({ ok: true });
}
