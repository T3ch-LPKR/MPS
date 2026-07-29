import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const term = (req.nextUrl.searchParams.get("q") || "").trim();
  if (term.length < 2) return NextResponse.json([]);

  const rows = await q<{ cust_code: string; cust_name: string; area: string }>(
    `SELECT cust_code, cust_name, area
       FROM sjp_customer
      WHERE is_active
        AND (cust_name ILIKE '%'||$1||'%' OR cust_code ILIKE '%'||$1||'%')
      ORDER BY cust_name
      LIMIT 20`,
    [term]
  );
  return NextResponse.json(rows);
}
