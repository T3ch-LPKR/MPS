import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { q } from "@/lib/db";
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
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries()) as PeriodSP & { dl?: string };
  const { first, last, label } = resolvePeriod(sp);
  const femp = sp.femp || "";
  // ?dl=belum|sudah -> hanya order dgn status download tsb (dipakai tombol "Download Semua" saat filter aktif)
  const dl = sp.dl === "sudah" || sp.dl === "belum" ? sp.dl : "semua";
  const orders = await loadOrdersForPdf(
    `o.tgl BETWEEN $1 AND $2 AND ($3='' OR o.emp_id=$3)
     AND ($4 = 'semua' OR ($4 = 'sudah') = (o.pdf_downloaded_at IS NOT NULL))`,
    [first, last, femp, dl]);
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

  // tandai semua order yang ikut dalam file ini sebagai sudah di-download
  await q(`UPDATE sjp_visit_order SET pdf_downloaded_at = now(), pdf_downloaded_by = $2 WHERE order_id = ANY($1)`,
    [orders.map((o) => o.order_id), s.username]);

  const inline = req.nextUrl.searchParams.get("inline") === "1"; // ?inline=1 -> buka di tab utk Print
  const fname = `SuratPesanan_${label.replace(/[^\w-]+/g, "_")}${femp ? `_${femp}` : ""}.pdf`;
  return new NextResponse(buf as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
