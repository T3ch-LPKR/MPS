import { NextRequest, NextResponse } from "next/server";
import { q1 } from "@/lib/db";
import { getSession } from "@/lib/session";
import { downloadPhoto } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Dual-read same-origin: foto baru di Storage (photo_path -> stream); foto lama masih bytea -> stream.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s || !["hos", "admin", "superadmin", "salesman"].includes(s.role)) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const row = await q1<{ photo: Buffer | null; photo_path: string | null }>(
    `SELECT photo, photo_path FROM sjp_visit_log WHERE visit_id=$1`, [Number(params.id)]
  );
  const buf = row?.photo_path ? await downloadPhoto(row.photo_path) : (row?.photo ?? null);
  if (!buf) return new NextResponse("not found", { status: 404 });
  return new NextResponse(buf as any, {
    status: 200,
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
  });
}
