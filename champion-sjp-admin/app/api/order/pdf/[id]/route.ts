import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getSession } from "@/lib/session";
import { loadOrdersForPdf, renderSuratPesanan } from "@/lib/suratPesanan";

export const dynamic = "force-dynamic";

// PDF Surat Pesanan satu order.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
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

  return new NextResponse(buf as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="SuratPesanan_${String(id).padStart(6, "0")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
