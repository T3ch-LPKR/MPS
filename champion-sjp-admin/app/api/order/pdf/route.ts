import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getSession } from "@/lib/session";
import { resolvePeriod, type PeriodSP } from "@/app/(admin)/laporan/period";
import { loadOrdersForPdf, renderSuratPesanan } from "@/lib/suratPesanan";

export const dynamic = "force-dynamic";

// PDF SEMUA order sesuai filter periode/salesman — satu Surat Pesanan per halaman.
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !["admin", "superadmin", "hos"].includes(s.role)) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries()) as PeriodSP;
  const { first, last, label } = resolvePeriod(sp);
  const femp = sp.femp || "";
  const orders = await loadOrdersForPdf("o.tgl BETWEEN $1 AND $2 AND ($3='' OR o.emp_id=$3)", [first, last, femp]);
  if (orders.length === 0) return new NextResponse("Tidak ada order pada periode ini.", { status: 404 });

  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));
  for (const o of orders) {
    doc.addPage({ size: "A4", margin: 0 });
    renderSuratPesanan(doc, o, s.username);
  }
  doc.end();
  const buf = await done;

  const fname = `SuratPesanan_${label.replace(/[^\w-]+/g, "_")}${femp ? `_${femp}` : ""}.pdf`;
  return new NextResponse(buf as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
