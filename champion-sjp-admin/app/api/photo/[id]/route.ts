import { NextRequest, NextResponse } from "next/server";
import { q1 } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s || !["hos", "admin", "superadmin", "salesman"].includes(s.role)) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const row = await q1<{ photo: Buffer | null }>(
    `SELECT photo FROM sjp_visit_log WHERE visit_id=$1`, [Number(params.id)]
  );
  if (!row?.photo) return new NextResponse("not found", { status: 404 });
  return new NextResponse(row.photo as any, {
    status: 200,
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
  });
}
