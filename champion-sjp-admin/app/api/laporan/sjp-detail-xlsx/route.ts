import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";
import { resolvePeriod, resolveDrill, type PeriodSP } from "@/app/(admin)/laporan/period";
import { DETAIL_SELECT } from "@/app/(admin)/laporan/detailSql";

export const dynamic = "force-dynamic";

// Export Excel "Detail Catatan Kunjungan" — SEMUA baris sesuai filter aktif (tanpa LIMIT 500).
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !["admin", "superadmin", "hos"].includes(s.role)) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries()) as PeriodSP;
  const { first, last, label } = resolvePeriod(sp);
  const femp = sp.femp || "";
  const { day, lov } = resolveDrill(sp, first, last);
  const f = day || first, l = day || last;

  const rows = await q<any>(DETAIL_SELECT, [f, l, femp, lov]);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Detail Catatan Kunjungan", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Tgl", key: "tgl", width: 12 },
    { header: "Jam", key: "jam", width: 7 },
    { header: "Salesman", key: "emp_name", width: 16 },
    { header: "Outlet", key: "outlet", width: 32 },
    { header: "Catatan", key: "catatan", width: 36 },
    { header: "Notes", key: "free_text", width: 32 },
    { header: "AR", key: "ar", width: 14, style: { numFmt: "#,##0" } },
    { header: "Kode", key: "kode", width: 18 },
  ];
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00586B" } };

  for (const r of rows) {
    ws.addRow({
      tgl: new Date(r.tgl), jam: r.jam, emp_name: r.emp_name, outlet: r.outlet,
      catatan: r.catatan, free_text: r.free_text || "", ar: r.ar != null ? Number(r.ar) : null,
      kode: r.kode,
    });
  }
  ws.getColumn("tgl").numFmt = "dd-mmm-yy";
  ws.autoFilter = { from: "A1", to: "H1" };

  const buf = await wb.xlsx.writeBuffer();
  const fname = `SJP_Detail_${label.replace(/[^\w-]+/g, "_")}${day ? `_${day}` : ""}${femp ? `_${femp}` : ""}.xlsx`;
  return new NextResponse(Buffer.from(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
