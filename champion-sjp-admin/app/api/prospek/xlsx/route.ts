import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { q } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Export Excel daftar Prospek — SEMUA status (aktif + arsip + tertaut).
export async function GET() {
  const s = await getSession();
  if (!s || !["admin", "superadmin", "hos"].includes(s.role)) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const rows = await q<any>(`
    SELECT p.prospek_id, p.nama_usaha, p.alamat, p.pic, p.hp,
           COALESCE(e.emp_name, p.emp_id) salesman, p.status, p.linked_cust_code,
           p.created_at::date::text tgl_dibuat
    FROM sjp_prospect p
    LEFT JOIN sjp_employee e ON e.emp_id = p.emp_id
    ORDER BY p.created_at DESC`);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Prospek", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "ID Prospek", key: "prospek_id", width: 18 },
    { header: "Nama Usaha", key: "nama_usaha", width: 28 },
    { header: "Alamat", key: "alamat", width: 36 },
    { header: "PIC", key: "pic", width: 16 },
    { header: "HP", key: "hp", width: 16 },
    { header: "Salesman", key: "salesman", width: 16 },
    { header: "Status", key: "status", width: 10 },
    { header: "Kode Customer", key: "linked_cust_code", width: 14 },
    { header: "Tgl Dibuat", key: "tgl_dibuat", width: 12 },
  ];
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00586B" } };

  for (const r of rows) {
    ws.addRow({
      prospek_id: r.prospek_id, nama_usaha: r.nama_usaha, alamat: r.alamat || "",
      pic: r.pic || "", hp: r.hp || "", salesman: r.salesman || "",
      status: r.status, linked_cust_code: r.linked_cust_code || "",
      tgl_dibuat: r.tgl_dibuat ? new Date(r.tgl_dibuat) : null,
    });
  }
  ws.getColumn("tgl_dibuat").numFmt = "dd-mmm-yy";
  ws.autoFilter = { from: "A1", to: "I1" };

  const buf = await wb.xlsx.writeBuffer();
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="SJP_Prospek_${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
