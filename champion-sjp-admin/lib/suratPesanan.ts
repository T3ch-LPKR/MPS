type PDFDoc = PDFKit.PDFDocument; // tipe ambient dari @types/pdfkit
import { q, q1 } from "./db";

// Render "SURAT PESANAN" (meniru formulir kertas MPS F.702.2-MKT.01-AO) — satu order per halaman.
// Kotak tinjauan/persetujuan dicetak kosong untuk diisi manual.

export type OrderPdfData = {
  order_id: number;
  tgl: string;              // YYYY-MM-DD
  toko: string;
  alamat: string | null;
  kode: string | null;      // cust_code / prospek_id
  salesman: string;
  items: { item_code: string; item_name: string; item_type: "ORDER" | "BONUS"; qty: number; price: number; total: number }[];
  subtotal: number; disc_type: string | null; disc_value: number | null; disc_amount: number; total: number;
  notes: string | null;
};

export async function loadOrdersForPdf(where: string, params: any[]): Promise<OrderPdfData[]> {
  const heads = await q<any>(`
    SELECT o.order_id, o.tgl::text tgl,
           COALESCE(c.cust_name, p.nama_usaha, o.cust_code, o.prospek_id) toko,
           COALESCE(c.address, p.alamat) alamat,
           COALESCE(o.cust_code, o.prospek_id) kode,
           e.emp_name salesman,
           o.subtotal, o.disc_type, o.disc_value, o.disc_amount, o.total, o.notes
    FROM sjp_visit_order o
    JOIN sjp_employee e ON e.emp_id = o.emp_id
    LEFT JOIN sjp_customer c ON c.cust_code = o.cust_code
    LEFT JOIN sjp_prospect p ON p.prospek_id = o.prospek_id
    WHERE ${where}
    ORDER BY o.tgl, o.order_id`, params);
  if (heads.length === 0) return [];
  const items = await q<any>(`
    SELECT order_id, item_code, item_name, item_type, qty, price, total
    FROM sjp_visit_order_item
    WHERE order_id = ANY($1)
    ORDER BY order_id, (item_type = 'BONUS'), line_no`, [heads.map((h: any) => h.order_id)]);
  const byOrder = new Map<number, any[]>();
  for (const it of items) {
    const arr = byOrder.get(it.order_id) || [];
    arr.push(it); byOrder.set(it.order_id, arr);
  }
  return heads.map((h: any) => ({
    ...h,
    subtotal: Number(h.subtotal), disc_value: h.disc_value != null ? Number(h.disc_value) : null,
    disc_amount: Number(h.disc_amount), total: Number(h.total),
    items: (byOrder.get(h.order_id) || []).map((it: any) => ({
      ...it, qty: Number(it.qty), price: Number(it.price), total: Number(it.total),
    })),
  }));
}

const rp = (n: number) => n.toLocaleString("id");
const L = 50, R = 545; // margin kiri/kanan (A4 = 595pt)

function hr(doc: PDFDoc, y: number, x1 = L, x2 = R, w = 0.7) {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(w).strokeColor("#000").stroke();
}

export function renderSuratPesanan(doc: PDFDoc, d: OrderPdfData, printedBy: string) {
  const [yy, mm, dd] = d.tgl.split("-");

  // ===== Kop =====
  doc.font("Helvetica-BoldOblique").fontSize(17).fillColor("#000").text("PT. MULTI PRIMA SEJAHTERA Tbk", L, 46);
  doc.font("Helvetica").fontSize(8.5)
    .text("Jl. Mandala Selatan No. 33 Tomang - Jakarta 11440", L, 66)
    .text("Telp. (021) 56968039", L, 77);
  doc.font("Helvetica-Bold").fontSize(12).text(`No. :  ${String(d.order_id).padStart(6, "0")}`, 380, 70, { width: R - 380, align: "right" });
  hr(doc, 90, L, R, 1.2);

  // ===== Nama toko + kode customer + tanggal =====
  doc.font("Helvetica-Bold").fontSize(10).text("Nama Toko :", L, 104);
  doc.font("Helvetica").fontSize(10).text(d.toko, L, 118, { width: 280 });
  const alamatY = doc.y + 2;
  doc.fontSize(9).fillColor("#222").text(d.alamat || "", L, alamatY, { width: 280 });
  // kode customer master (Cust_Code) — tegas & berlabel; prospek = belum tertaut ke master
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(10)
    .text(`Kode Cust : ${d.kode || "-"}${d.kode && d.kode.startsWith("PROSPEK") ? "  (belum tertaut)" : ""}`,
      L, doc.y + 3, { width: 280 });
  doc.fillColor("#000").font("Helvetica").fontSize(10)
    .text(`Jakarta,  ${dd} / ${mm} / ${yy}`, 360, 112, { width: R - 360, align: "right" });

  // ===== Judul =====
  let y = Math.max(doc.y + 10, 168);
  doc.font("Helvetica-Bold").fontSize(14).text("SURAT PESANAN", L, y, { width: R - L, align: "center", underline: true });
  if (d.kode) doc.font("Helvetica-Bold").fontSize(11).text(d.kode, L, y + 20, { width: R - L, align: "center" });
  y += d.kode ? 38 : 24;
  doc.font("Helvetica").fontSize(10).text("Bersama ini kami pesan barang-barang sbb :", L, y);
  y += 16;

  // ===== Tabel =====
  const cols = [L, L + 85, L + 300, L + 390, R]; // BANYAKNYA | NAMA BARANG | HARGA SATUAN | JUMLAH
  const headH = 24, rowH = 17;
  const tableTop = y;
  doc.rect(cols[0], y, R - L, headH).fillAndStroke("#eeeeee", "#000");
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(9);
  doc.text("BANYAKNYA", cols[0], y + 8, { width: cols[1] - cols[0], align: "center" });
  doc.text("NAMA BARANG", cols[1], y + 8, { width: cols[2] - cols[1], align: "center" });
  doc.text("HARGA SATUAN", cols[2], y + 8, { width: cols[3] - cols[2], align: "center" });
  doc.text("JUMLAH", cols[3], y + 8, { width: cols[4] - cols[3], align: "center" });
  y += headH;

  const orderItems = d.items.filter((i) => i.item_type === "ORDER");
  const bonusItems = d.items.filter((i) => i.item_type === "BONUS");
  const totalQty = orderItems.reduce((a, i) => a + i.qty, 0);

  const row = (c1: string, c2: string, c3: string, c4: string, opts?: { bold?: boolean; mut?: boolean }) => {
    doc.font(opts?.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(opts?.mut ? "#444" : "#000");
    doc.text(c1, cols[0] + 4, y + 5, { width: cols[1] - cols[0] - 8, align: "center" });
    doc.text(c2, cols[1] + 6, y + 5, { width: cols[2] - cols[1] - 12 });
    doc.text(c3, cols[2] + 4, y + 5, { width: cols[3] - cols[2] - 8, align: "right" });
    doc.text(c4, cols[3] + 4, y + 5, { width: cols[4] - cols[3] - 10, align: "right" });
    y += rowH;
  };

  for (const it of orderItems) row(rp(it.qty), it.item_name, rp(it.price), rp(it.total));
  row(rp(totalQty), "", "", "", { bold: true }); // total qty spt formulir kertas
  for (const it of bonusItems) row(rp(it.qty), `Bonus — ${it.item_name}`, "-", "-", { mut: true });
  if (d.disc_amount > 0) {
    row("", d.disc_type === "PCT" ? `Diskon ${rp(d.disc_value || 0)}%` : "Diskon", "", `- ${rp(d.disc_amount)}`, { bold: true });
  }

  // baris grand total
  const tableBottom = y + rowH;
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000");
  doc.text("Rp", cols[3] + 4, y + 4);
  doc.text(rp(d.total), cols[3] + 4, y + 4, { width: cols[4] - cols[3] - 10, align: "right" });
  y = tableBottom;
  // garis kolom + tepi tabel
  for (const cx of cols) doc.moveTo(cx, tableTop).lineTo(cx, tableBottom).lineWidth(0.7).strokeColor("#000").stroke();
  hr(doc, tableBottom);

  // ===== Notes + syarat pembayaran =====
  y = tableBottom + 8;
  if (d.notes) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor("#222").text(`Catatan: ${d.notes}`, L, y, { width: R - L });
    y = doc.y + 4;
  }
  doc.fillColor("#000").font("Helvetica").fontSize(10).text("Syarat pembayaran  : ______________", L, y);
  y += 20;

  // ===== Tanda tangan =====
  doc.font("Helvetica").fontSize(10);
  doc.text("Diterima oleh,", L + 10, y);
  doc.text("Dipesan oleh,", 380, y, { width: R - 390, align: "center" });
  doc.font("Helvetica-Bold").text("Tanda Tangan & Cap", 380, y + 46, { width: R - 390, align: "center" });
  doc.font("Helvetica").text(`( ${d.salesman} )`, L - 10, y + 46, { width: 180, align: "center" });
  y += 66;

  // ===== Kotak tinjauan (diisi manual) =====
  const boxH = 46;
  const cb = (x: number, cy: number, label: string) => { // checkbox
    doc.rect(x, cy, 9, 9).lineWidth(0.8).stroke();
    doc.font("Helvetica").fontSize(9).text(label, x + 13, cy);
  };
  const box = (title: string, l1: string, l2: string, right: string, cy: number) => {
    doc.rect(L, cy, R - L, boxH).lineWidth(0.8).stroke();
    doc.moveTo(L + 330, cy).lineTo(L + 330, cy + boxH).stroke();
    doc.font("Helvetica-Bold").fontSize(9.5).text(title, L + 8, cy + 6);
    doc.font("Helvetica").fontSize(9).text(l1, L + 8, cy + 20);
    cb(L + 120, cy + 19, "Ok"); cb(L + 170, cy + 19, "No");
    doc.font("Helvetica").fontSize(9).text(l2, L + 8, cy + 33);
    cb(L + 120, cy + 32, "");
    doc.font("Helvetica").fontSize(9).text("Diperiksa oleh,", L + 338, cy + 6);
    doc.text(right, L + 338, cy + 33);
  };
  box("Tinjauan pesanan :", "Harga", "Pembayaran", "(Sales Supervisor)", y);
  box("Tinjauan kemampuan :", "Kesiapan barang", "Delivery", "(Sales Administrasi)", y + boxH);
  // disetujui
  doc.rect(L, y + boxH * 2, R - L, 40).lineWidth(0.8).stroke();
  doc.moveTo(L + 330, y + boxH * 2).lineTo(L + 330, y + boxH * 2 + 40).stroke();
  doc.font("Helvetica").fontSize(9).text("Disetujui oleh,", L + 338, y + boxH * 2 + 6);
  doc.text("(Sales Manager)", L + 338, y + boxH * 2 + 27);

  // ===== Footer =====
  const fy = y + boxH * 2 + 48;
  doc.font("Helvetica").fontSize(8.5).fillColor("#000").text("( F.702.2-MKT.01-AO )", L, fy);
  doc.fontSize(7.5).fillColor("#666")
    .text(`Dicetak dari SJP oleh ${printedBy} · ${new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ")} WIB`, L, fy + 11);
}

export async function orderExists(id: number) {
  return q1(`SELECT 1 FROM sjp_visit_order WHERE order_id=$1`, [id]);
}
