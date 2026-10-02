import Link from "next/link";
import { q } from "@/lib/db";
import { resolvePeriod, type PeriodSP } from "../period";
import PeriodFilter from "../PeriodFilter";
import SortableTable, { type Col } from "../SortableTable";
import KpiStrip from "../KpiStrip";
import Tabs from "../Tabs";

export const dynamic = "force-dynamic";

const rp = (n: number) => "Rp " + Number(n || 0).toLocaleString("id");

// Laporan Orderan salesman (hasil input pembelian di kunjungan berkategori Order).
export default async function OrderReportPage({ searchParams }: { searchParams: PeriodSP & { nsp?: string; dl?: string } }) {
  const { first, last, label } = resolvePeriod(searchParams);
  const femp = searchParams.femp || "";
  // Cari No. SP (= order_id, tampil 6 digit): bila diisi, cari di SEMUA tanggal (abaikan periode)
  const nsp = /^\d+$/.test(String(searchParams.nsp || "").trim()) ? Number(searchParams.nsp) : null;
  // Filter status download PDF: semua (default) | belum | sudah
  const dl = searchParams.dl === "sudah" || searchParams.dl === "belum" ? searchParams.dl : "semua";
  const salesmen = await q<any>(`SELECT emp_id, emp_name FROM sjp_employee WHERE is_salesman ORDER BY emp_name`);

  const rows = await q<any>(`
    SELECT o.order_id, o.visit_id, o.tgl::text tgl, e.emp_name,
           COALESCE(c.cust_name, p.nama_usaha, o.cust_code, o.prospek_id) toko,
           COALESCE(o.cust_code, o.prospek_id) kode,
           (SELECT count(*) FROM sjp_visit_order_item i WHERE i.order_id=o.order_id) n_item,
           (SELECT COALESCE(SUM(i.qty),0) FROM sjp_visit_order_item i WHERE i.order_id=o.order_id AND i.item_type='BONUS') qty_bonus,
           o.subtotal, o.disc_amount, o.total, o.notes,
           COALESCE(o.updated_by, o.created_by) last_by, o.updated_at,
           to_char(o.pdf_downloaded_at AT TIME ZONE 'Asia/Jakarta','DD/MM HH24:MI') dl_at, o.pdf_downloaded_by dl_by
    FROM sjp_visit_order o
    JOIN sjp_employee e ON e.emp_id = o.emp_id
    LEFT JOIN sjp_customer c ON c.cust_code = o.cust_code
    LEFT JOIN sjp_prospect p ON p.prospek_id = o.prospek_id
    WHERE ($4::int IS NOT NULL OR (o.tgl BETWEEN $1 AND $2 AND ($3='' OR o.emp_id=$3)))
      AND ($4::int IS NULL OR o.order_id = $4)
      AND ($5 = 'semua' OR ($5 = 'sudah') = (o.pdf_downloaded_at IS NOT NULL))
    ORDER BY o.tgl DESC, o.order_id DESC`, [first, last, femp, nsp, dl]);

  const num = (x: any) => Number(x || 0);
  const T = rows.reduce((a: any, r: any) => ({
    n: a.n + 1, item: a.item + num(r.n_item), sub: a.sub + num(r.subtotal),
    disc: a.disc + num(r.disc_amount), tot: a.tot + num(r.total),
  }), { n: 0, item: 0, sub: 0, disc: 0, tot: 0 });

  const baseP = () => {
    const p = new URLSearchParams();
    if (searchParams.m) p.set("m", searchParams.m);
    if (searchParams.from) p.set("from", searchParams.from);
    if (searchParams.to) p.set("to", searchParams.to);
    if (femp) p.set("femp", femp);
    return p;
  };
  const qs = (() => {
    const p = baseP();
    if (dl !== "semua") p.set("dl", dl); // "Download Semua" ikut filter status
    const s = p.toString();
    return s ? "?" + s : "";
  })();
  const hrefDl = (v: string) => {
    const p = baseP();
    if (v !== "semua") p.set("dl", v);
    const s = p.toString();
    return `/laporan/order${s ? "?" + s : ""}`;
  };

  const tableRows = rows.map((r: any) => ({
    __key: r.order_id,
    nsp: String(r.order_id).padStart(6, "0"),
    tgl: r.tgl, emp_name: r.emp_name, toko: r.toko, kode: r.kode,
    n_item: num(r.n_item), bonus: num(r.qty_bonus) || null,
    disc: num(r.disc_amount) || null, total: num(r.total),
    notes: r.notes || "", last_by: r.last_by || "",
    dl: r.dl_at ? `✓ ${r.dl_at}` : "", "__tone_dl": r.dl_at ? "p-ok" : "p-mut",
    aksi: (
      <span className="whitespace-nowrap">
        {/* Print = PDF yang sama dibuka di tab (inline) -> tinggal Ctrl+P; status ikut tertandai */}
        <a href={`/api/order/pdf/${r.order_id}?inline=1`} target="_blank" rel="noreferrer" className="btn btn-sm">🖨 Preview Print</a>{" "}
        <a href={`/api/order/pdf/${r.order_id}`} className="btn btn-sm" download>PDF</a>{" "}
        <Link href={`/laporan/order/${r.order_id}`} className="btn btn-sm">✎ Edit</Link>
      </span>
    ),
  }));
  const cols: Col[] = [
    { key: "nsp", label: "No. SP", align: "left" },
    { key: "tgl", label: "Tgl", fmt: "date" },
    { key: "emp_name", label: "Salesman" },
    { key: "toko", label: "Toko" },
    { key: "kode", label: "Kode" },
    { key: "n_item", label: "Item", align: "center", fmt: "int" },
    { key: "bonus", label: "Qty Bonus", align: "center", fmt: "int" },
    { key: "disc", label: "Diskon", align: "right", fmt: "rp" },
    { key: "total", label: "Total", align: "right", fmt: "rp" },
    { key: "notes", label: "Notes" },
    { key: "last_by", label: "Oleh" },
    { key: "dl", label: "Download/Print", align: "center", fmt: "stat" },
    { key: "aksi", label: "Aksi", align: "center" },
  ];

  return (
    <>
      <div className="mb-1 text-xl font-bold">Laporan Orderan</div>
      <div className="text-sm text-mut mb-3">Pembelian yang dicatat salesman saat kunjungan (catatan kategori Order)</div>
      <Tabs active="/laporan/order" />
      <PeriodFilter action="/laporan/order" sp={searchParams} salesmen={salesmen} label={label} />

      <KpiStrip items={[
        { label: "Jumlah Order", value: T.n },
        { label: "Baris Item", value: T.item },
        { label: "Subtotal", value: rp(T.sub) },
        { label: "Diskon", value: rp(T.disc) },
        { label: "Total Orderan", value: rp(T.tot), lead: true },
      ]} />

      <div className="card p-4">
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-[13px] font-bold">Daftar Order — {nsp != null ? `No. SP ${String(nsp).padStart(6, "0")}` : label}</div>
            {/* filter status download PDF */}
            <div className="flex gap-1 text-xs">
              {([["semua", "Semua"], ["belum", "Belum di-download"], ["sudah", "Sudah"]] as const).map(([v, lbl]) => (
                <Link key={v} href={hrefDl(v)} className={`btn btn-sm ${dl === v ? "btn-pri" : ""}`}>{lbl}</Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* cari No. SP: mencari di semua tanggal, mengabaikan filter periode */}
            <form method="GET" action="/laporan/order" className="flex items-center gap-1.5">
              {searchParams.m ? <input type="hidden" name="m" value={searchParams.m} /> : null}
              {searchParams.from ? <input type="hidden" name="from" value={searchParams.from} /> : null}
              {searchParams.to ? <input type="hidden" name="to" value={searchParams.to} /> : null}
              {femp ? <input type="hidden" name="femp" value={femp} /> : null}
              {dl !== "semua" ? <input type="hidden" name="dl" value={dl} /> : null}
              <input name="nsp" defaultValue={searchParams.nsp || ""} inputMode="numeric"
                className="inp !w-32 !py-1.5 text-sm font-mono" placeholder="No. SP…" />
              <button className="btn btn-sm" type="submit">Cari</button>
              {nsp != null ? <Link href={`/laporan/order${qs}`} className="btn btn-sm">✕</Link> : null}
            </form>
            <a href={`/api/order/pdf${qs}${qs ? "&" : "?"}inline=1`} target="_blank" rel="noreferrer" className="btn btn-sm">🖨 Preview Print Semua</a>
            <a href={`/api/order/pdf${qs}`} className="btn btn-sm" download>⬇ Download Semua (PDF)</a>
          </div>
        </div>
        <SortableTable columns={cols} rows={tableRows} initial={{ key: "tgl", dir: "desc" }} empty="Belum ada order pada periode ini." />
      </div>
      <div className="text-[11px] text-mut mt-2">
        PDF per baris = Surat Pesanan satu order. "Download Semua" = seluruh order terfilter (ikut filter status download), satu surat per halaman.
        Kolom Download otomatis bertanda ✓ begitu PDF-nya diunduh (per order maupun lewat Download Semua).
        Perubahan oleh salesman (hari yang sama) maupun admin tercatat di kolom Oleh &amp; riwayat audit.
      </div>
    </>
  );
}
