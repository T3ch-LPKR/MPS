import { NextRequest, NextResponse } from "next/server";
import { q1 } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Foto berita (bytea) -> image/jpeg. Semua user login boleh lihat.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return new NextResponse("unauthorized", { status: 401 });
  const row = await q1<{ photo: Buffer | null }>(
    `SELECT photo FROM sjp_news WHERE news_id=$1`, [Number(params.id)]
  );
  if (!row?.photo) return new NextResponse("not found", { status: 404 });
  return new NextResponse(row.photo as any, {
    status: 200,
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
  });
}
