import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Pencarian cepat master produk (sjp_product, sync harian dari dwh.DimProduct).
// Index trgm di item_name & item_code -> ILIKE tetap cepat.
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json([], { status: 401 });
  const term = (req.nextUrl.searchParams.get("q") || "").trim();
  if (term.length < 2) return NextResponse.json([]);
  const rows = await q(
    `SELECT item_code, item_name, item_spec, product_line, unit
     FROM sjp_product
     WHERE is_active AND (item_name ILIKE '%' || $1 || '%' OR item_code ILIKE '%' || $1 || '%'
       OR item_spec ILIKE '%' || $1 || '%')
     ORDER BY item_name, item_spec LIMIT 20`,
    [term]
  );
  return NextResponse.json(rows);
}
