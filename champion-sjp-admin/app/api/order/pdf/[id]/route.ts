import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";
import { loadOrdersForPdf, renderSuratPesanan } from "@/lib/suratPesanan";

export const dynamic = "force-dynamic";

// PDF Surat Pesanan satu order. ?inline=1 -> tampil di tab browser (untuk Print), bukan unduhan;
// keduanya sama-sama menandai pdf_downloaded_at.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const inline = req.nextUrl.searchParams.get("inline") === "1";
  const s = await getSession();
  if (!s || !["admin", "superadmin", "hos"].includes(s.role)) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id)) return new NextResponse("bad id", { status: 400 });
  const orders = await loadOrdersForPdf("o.order_id = $1", [id]);
  if (orders.length === 0) return new NextResponse("not found", { status: 404 });

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));
  renderSuratPesanan(doc, orders[0], s.username);
  doc.end();
  const buf = await done;

  // tandai sudah di-download (timestamp terakhir + siapa)
  await q(`UPDATE sjp_visit_order SET pdf_downloaded_at = now(), pdf_downloaded_by = $2 WHERE order_id = $1`,
    [id, s.username]);

  return new NextResponse(buf as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="SuratPesanan_${String(id).padStart(6, "0")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
