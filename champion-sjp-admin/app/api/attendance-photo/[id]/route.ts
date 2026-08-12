import { NextRequest, NextResponse } from "next/server";
import { q1 } from "@/lib/db";
import { getSession } from "@/lib/session";
import { downloadPhoto } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Foto absensi (dari Storage) di-stream same-origin. Guard admin/hos/superadmin.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s || !["hos", "admin", "superadmin"].includes(s.role)) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const row = await q1<{ photo_path: string | null }>(
    `SELECT photo_path FROM sjp_attendance WHERE att_id=$1`, [Number(params.id)]);
  const buf = await downloadPhoto(row?.photo_path || null);
  if (!buf) return new NextResponse("not found", { status: 404 });
  return new NextResponse(buf as any, {
    status: 200,
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
  });
}
