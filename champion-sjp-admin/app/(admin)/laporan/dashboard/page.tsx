import Link from "next/link";
import { q, q1 } from "@/lib/db";
import { resolvePeriod, resolveDrill, type PeriodSP } from "../period";
import PeriodFilter from "../PeriodFilter";
import SortableTable, { type Col } from "../SortableTable";
import KpiStrip from "../KpiStrip";
import Tabs from "../Tabs";
import TrendChart, { type TrendRow } from "../TrendChart";
import NotesMatrix, { type NoteRow } from "../NotesMatrix";

export const dynamic = "force-dynamic";

const pct1 = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const rp = (n: number) => "Rp " + Number(n || 0).toLocaleString("id");
const mn = (n: number) => (!n ? "0" : n >= 1e9 ? `${(n / 1e9).toLocaleString("id", { maximumFractionDigits: 1 })}B` : `${Math.round(n / 1e6)}M`);
const num = (x: any) => Number(x || 0);

// filter LOV pada kunjungan (dipakai berulang): $4 NULL = tanpa filter catatan
const LOV_V = `($4::int IS NULL OR $4 = ANY(COALESCE(v.catatan_lov_ids, ARRAY[v.catatan_lov_id])))`;

export default async function DashboardSJPPage({ searchParams }: { searchParams: PeriodSP }) {
  const { first, last, label } = resolvePeriod(searchParams);
  const femp = searchParams.femp || "";
  const { day, lov } = resolveDrill(searchParams, first, last);
  // KPI/tabel/detail mengikuti drill ?day=; chart tetap menampilkan seluruh periode.
  const f = day || first, l = day || last;

  const [salesmen, kpi, daily, empRowsRaw, noteRows, detailRaw] = await Promise.all([
    q<any>(`SELECT emp_id, emp_name FROM sjp_employee WHERE is_salesman ORDER BY emp_name`),

    // ---- KPI (rumus identik dgn halaman Produktivitas; Realisasi dari SISI JADWAL, maks = Plan) ----
    q1<any>(`
      WITH vf AS (
        SELECT v.*, COALESCE(v.catatan_lov_ids, ARRAY[v.catatan_lov_id]) cat_ids
        FROM sjp_visit_log v JOIN sjp_employee e ON e.emp_id = v.emp_id AND e.is_salesman
        WHERE v.tgl BETWEEN $1 AND $2 AND ($3='' OR v.emp_id=$3) AND ${LOV_V})
      SELECT
       (SELECT count(*) FROM sjp_schedule s JOIN sjp_employee e ON e.emp_id=s.emp_id AND e.is_salesman
         WHERE s.tgl BETWEEN $1 AND $2 AND ($3='' OR s.emp_id=$3)) plan,
       (SELECT count(*) FROM sjp_schedule s JOIN sjp_employee e ON e.emp_id=s.emp_id AND e.is_salesman
         WHERE s.tgl BETWEEN $1 AND $2 AND ($3='' OR s.emp_id=$3)
           AND EXISTS (SELECT 1 FROM sjp_visit_log v WHERE v.sched_id = s.sched_id AND ${LOV_V})) done,
       (SELECT count(DISTINCT cust_code) FROM vf) cust,
       (SELECT count(DISTINCT emp_id) FROM vf) sales,
       (SELECT count(*) FROM vf) visit,
       (SELECT count(*) FILTER (WHERE is_oos) FROM vf) oos,
       (SELECT count(*) FILTER (WHERE is_effective_call) FROM vf) eff,
       (SELECT count(*) FROM vf WHERE EXISTS (SELECT 1 FROM sjp_lov lv WHERE lv.lov_id = ANY(vf.cat_ids) AND lv.kode='LOV-07')) arf,
       (SELECT COALESCE(SUM(ar_amount),0) FROM vf WHERE ar_collect IS NOT NULL) arc`,
      [f, l, femp, lov]),

    // ---- Tren harian: seluruh periode (tanpa ?day=), hari tanpa data dilewati spt PBI ----
    q<any>(`
      WITH sch AS (
        SELECT s.tgl, count(*) plan,
               count(*) FILTER (WHERE EXISTS (SELECT 1 FROM sjp_visit_log v WHERE v.sched_id = s.sched_id AND ${LOV_V})) done
        FROM sjp_schedule s JOIN sjp_employee e ON e.emp_id=s.emp_id AND e.is_salesman
        WHERE s.tgl BETWEEN $1 AND $2 AND ($3='' OR s.emp_id=$3) GROUP BY s.tgl),
      vis AS (
        SELECT v.tgl, count(*) visit,
               count(*) FILTER (WHERE v.is_oos) oos,
               count(*) FILTER (WHERE v.is_effective_call) ec,
               count(*) FILTER (WHERE EXISTS (SELECT 1 FROM sjp_lov lv
                 WHERE lv.lov_id = ANY(COALESCE(v.catatan_lov_ids, ARRAY[v.catatan_lov_id])) AND lv.kode='LOV-07')) arfu,
               COALESCE(SUM(v.ar_amount) FILTER (WHERE v.ar_collect IS NOT NULL),0) arc,
               count(DISTINCT v.cust_code) cust
        FROM sjp_visit_log v JOIN sjp_employee e ON e.emp_id=v.emp_id AND e.is_salesman
        WHERE v.tgl BETWEEN $1 AND $2 AND ($3='' OR v.emp_id=$3) AND ${LOV_V} GROUP BY v.tgl)
      SELECT to_char(COALESCE(sch.tgl, vis.tgl),'YYYY-MM-DD') d,
             COALESCE(sch.plan,0) plan, COALESCE(sch.done,0) done, COALESCE(vis.visit,0) visit,
             COALESCE(vis.oos,0) oos, COALESCE(vis.ec,0) ec, COALESCE(vis.arfu,0) arfu,
             COALESCE(vis.arc,0) arc, COALESCE(vis.cust,0) cust
      FROM sch FULL JOIN vis ON vis.tgl = sch.tgl
      ORDER BY 1`,
      [first, last, femp, lov]),

    // ---- Tabel salesman ----
    q<any>(`
      SELECT e.emp_id, e.emp_name,
       (SELECT count(*) FROM sjp_schedule s WHERE s.emp_id=e.emp_id AND s.tgl BETWEEN $1 AND $2
          AND EXISTS (SELECT 1 FROM sjp_visit_log v WHERE v.sched_id = s.sched_id AND ${LOV_V})) onplan,
       (SELECT count(*) FROM sjp_visit_log v WHERE v.emp_id=e.emp_id AND v.tgl BETWEEN $1 AND $2 AND v.is_oos AND ${LOV_V}) oos,
       (SELECT count(*) FROM sjp_visit_log v WHERE v.emp_id=e.emp_id AND v.tgl BETWEEN $1 AND $2 AND v.is_effective_call AND ${LOV_V}) ec,
       (SELECT count(DISTINCT v.prospek_id) FROM sjp_visit_log v WHERE v.emp_id=e.emp_id AND v.tgl BETWEEN $1 AND $2 AND v.prospek_id IS NOT NULL AND ${LOV_V}) prospek,
       (SELECT COALESCE(SUM(v.ar_amount),0) FROM sjp_visit_log v WHERE v.emp_id=e.emp_id AND v.tgl BETWEEN $1 AND $2 AND v.ar_collect IS NOT NULL AND ${LOV_V}) arc
      FROM sjp_employee e
      WHERE e.is_salesman AND ($3='' OR e.emp_id=$3)
      ORDER BY e.emp_name`,
      [f, l, femp, lov]),

    // ---- Matriks catatan (mengabaikan filter ?lov= miliknya sendiri; item terpilih disorot) ----
    q<any>(`
      SELECT COALESCE(lv.kategori,'Lainnya') kategori, lv.teks, lv.lov_id, count(DISTINCT v.visit_id) n
      FROM sjp_visit_log v
       JOIN sjp_lov lv ON lv.lov_id = ANY(COALESCE(v.catatan_lov_ids, ARRAY[v.catatan_lov_id])) AND lv.tipe='CATATAN'
       JOIN sjp_employee e ON e.emp_id=v.emp_id AND e.is_salesman
      WHERE v.tgl BETWEEN $1 AND $2 AND ($3='' OR v.emp_id=$3)
      GROUP BY 1,2,3 ORDER BY n DESC`,
      [f, l, femp]),

    // ---- Detail catatan kunjungan (AR hanya bila memang penagihan tercatat) ----
    q<any>(`
      SELECT v.visit_id, v.tgl::text tgl, to_char(v.checkin_dt,'HH24:MI') jam, e.emp_name,
       COALESCE(c.cust_name, p.nama_usaha, v.cust_code, v.prospek_id) outlet,
       (SELECT string_agg(lv.teks, ', ' ORDER BY lv.kode) FROM sjp_lov lv
          WHERE lv.lov_id = ANY(COALESCE(v.catatan_lov_ids, ARRAY[v.catatan_lov_id])) AND lv.tipe='CATATAN') catatan,
       v.free_text, CASE WHEN v.ar_collect IS NOT NULL THEN v.ar_amount END ar,
       count(*) OVER () total
      FROM sjp_visit_log v
       JOIN sjp_employee e ON e.emp_id = v.emp_id AND e.is_salesman
       LEFT JOIN sjp_customer c ON c.cust_code = v.cust_code
       LEFT JOIN sjp_prospect p ON p.prospek_id = v.prospek_id
      WHERE v.tgl BETWEEN $1 AND $2 AND ($3='' OR v.emp_id=$3) AND ${LOV_V}
      ORDER BY v.checkin_dt DESC LIMIT 500`,
      [f, l, femp, lov]),
  ]);

  const K = {
    plan: num(kpi?.plan), done: num(kpi?.done), cust: num(kpi?.cust), sales: num(kpi?.sales),
    visit: num(kpi?.visit), oos: num(kpi?.oos), eff: num(kpi?.eff), arf: num(kpi?.arf), arc: num(kpi?.arc),
  };

  // pg mengembalikan count/bigint sebagai string -> normalisasi sebelum dikirim ke komponen klien
  const dailyRows: TrendRow[] = daily.map((r: any) => ({
    d: r.d, plan: num(r.plan), done: num(r.done), visit: num(r.visit), oos: num(r.oos),
    ec: num(r.ec), arfu: num(r.arfu), arc: num(r.arc), cust: num(r.cust),
  }));
  const notes: NoteRow[] = noteRows.map((r: any) => ({
    kategori: r.kategori, teks: r.teks, lov_id: num(r.lov_id), n: num(r.n),
  }));

  // baseline query-string utk chip & klik-filter
  const baseParams: Record<string, string> = {};
  if (searchParams.m) baseParams.m = searchParams.m;
  if (searchParams.from) baseParams.from = searchParams.from;
  if (searchParams.to) baseParams.to = searchParams.to;
  if (femp) baseParams.femp = femp;
  if (day) baseParams.day = day;
  if (lov) baseParams.lov = String(lov);
  const href = (omit: string[], set?: Record<string, string>) => {
    const p = new URLSearchParams(Object.fromEntries(Object.entries(baseParams).filter(([k]) => !omit.includes(k))));
    for (const [k, v] of Object.entries(set || {})) p.set(k, v);
    const s = p.toString();
    return `/laporan/dashboard${s ? "?" + s : ""}`;
  };
  const dropKey = (k: string) => Object.fromEntries(Object.entries(baseParams).filter(([x]) => x !== k));

  const empRows = empRowsRaw
    .map((r: any) => ({ ...r, onplan: num(r.onplan), oos: num(r.oos), ec: num(r.ec), prospek: num(r.prospek), arc: num(r.arc) }))
    .filter((r: any) => r.onplan + r.oos + r.ec + r.prospek + r.arc > 0);
  const maxArc = Math.max(1, ...empRows.map((r: any) => r.arc));
  const empTable = empRows.map((r: any) => ({
    __key: r.emp_id, __href: href([], femp === r.emp_id ? { femp: "" } : { femp: r.emp_id }),
    emp_name: r.emp_name, onplan: r.onplan, oos: r.oos, ec: r.ec,
    prospek: r.prospek || null, arc: r.arc, __pct_arc: Math.round((r.arc / maxArc) * 100),
  }));
  const empCols: Col[] = [
    { key: "emp_name", label: "Salesman", align: "left" },
    { key: "onplan", label: "On Plan", align: "center", fmt: "int", color: "#2B579A" },
    { key: "oos", label: "OOS", align: "center", fmt: "int", color: "#D83B01" },
    { key: "ec", label: "EC", align: "center", fmt: "int", color: "#2B579A" },
    { key: "prospek", label: "Prospek", align: "center", fmt: "int", color: "#107C10" },
    { key: "arc", label: "AR Coll", align: "right", fmt: "mnbar", color: "#70AD47" },
  ];

  const detailRows = detailRaw.map((r: any) => ({
    __key: r.visit_id, tgl: r.tgl, jam: r.jam, emp_name: r.emp_name, outlet: r.outlet,
    catatan: r.catatan, free_text: r.free_text || "", ar: r.ar != null ? num(r.ar) : null,
  }));
  const detailTotal = num(detailRaw[0]?.total);
  const detailCols: Col[] = [
    { key: "tgl", label: "Tgl", align: "left", fmt: "date" },
    { key: "jam", label: "Jam", align: "left" },
    { key: "emp_name", label: "Salesman", align: "left" },
    { key: "outlet", label: "Outlet", align: "left" },
    { key: "catatan", label: "Catatan", align: "left" },
    { key: "free_text", label: "Notes", align: "left" },
    { key: "ar", label: "AR", align: "right", fmt: "rp" },
  ];

  const fempName = salesmen.find((s: any) => s.emp_id === femp)?.emp_name;
  const lovName = notes.find((r) => r.lov_id === lov)?.teks || (lov ? `LOV #${lov}` : null);
  const chips: { label: string; clear: string }[] = [];
  if (fempName) chips.push({ label: `Salesman: ${fempName}`, clear: href(["femp"]) });
  if (day) chips.push({ label: `Tanggal: ${new Date(day).toLocaleDateString("id")}`, clear: href(["day"]) });
  if (lov) chips.push({ label: `Catatan: ${lovName}`, clear: href(["lov"]) });

  return (
    <>
      <div className="mb-1 text-xl font-bold">Dashboard SJP</div>
      <div className="text-sm text-mut mb-3">Ringkasan Sales Journey Plan — tampilan setara halaman SJP Power BI</div>
      <Tabs active="/laporan/dashboard" />
      <PeriodFilter action="/laporan/dashboard" sp={searchParams} salesmen={salesmen} label={label} />

      <div className="bg-[#00586B] text-white rounded-xl px-4 py-2 mb-3 flex items-center justify-between flex-wrap gap-2">
        <div className="font-bold tracking-[0.2em] text-sm">--------- SALES JOURNEY PLAN ---------</div>
        <div className="text-xs opacity-90">{label}{day ? ` · ${new Date(day).toLocaleDateString("id")}` : ""}</div>
      </div>

      {chips.length ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {chips.map((c) => (
            <Link key={c.label} href={c.clear} className="pill p-info hover:opacity-80">{c.label} ✕</Link>
          ))}
          <Link href={href(["femp", "day", "lov"])} className="pill p-mut hover:opacity-80">Hapus semua filter</Link>
        </div>
      ) : null}

      <KpiStrip size="lg" items={[
        { label: "Cust Dikunjungi", value: K.cust },
        { label: "Salesman", value: K.sales },
        { label: "Plan", value: K.plan },
        { label: "Realization", value: K.done },
        { label: "Compliance %", value: lov ? "–" : `${pct1(K.done, K.plan)}%`, lead: true, sub: lov ? "n/a saat filter catatan" : `${K.done}/${K.plan}` },
        { label: "OOS", value: K.oos },
        { label: "Effective Call", value: K.eff },
        { label: "EC %", value: `${pct1(K.eff, K.visit)}%` },
        { label: "AR Follow Up", value: K.arf },
        { label: "AR Collection", value: mn(K.arc), sub: rp(K.arc) },
      ]} />

      <div className="card p-4 mb-4">
        <TrendChart rows={dailyRows} params={dropKey("day")} activeDay={day} lovActive={!!lov} />
      </div>

      <div className="grid lg:grid-cols-[420px_1fr] gap-4 items-start">
        <div className="grid gap-4 min-w-0">
          <div className="card p-4">
            <div className="text-[13px] font-bold mb-2">Kinerja Salesman</div>
            <SortableTable columns={empCols} rows={empTable} initial={{ key: "onplan", dir: "desc" }} empty="Tidak ada data." />
            {empRows.length ? (
              <div className="text-[11px] text-mut mt-2 tabular-nums">
                Total: On Plan {empRows.reduce((a: number, r: any) => a + r.onplan, 0)} · OOS {empRows.reduce((a: number, r: any) => a + r.oos, 0)} · EC {empRows.reduce((a: number, r: any) => a + r.ec, 0)} · AR {mn(empRows.reduce((a: number, r: any) => a + r.arc, 0))} — klik baris untuk memfilter
              </div>
            ) : null}
          </div>
          <div className="card p-4">
            <div className="text-[13px] font-bold mb-2">Catatan Kunjungan</div>
            <NotesMatrix rows={notes} params={dropKey("lov")} activeLov={lov} />
          </div>
        </div>

        <div className="card p-4 min-w-0">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[13px] font-bold">Detail Catatan Kunjungan</div>
            <div className="text-[11px] text-mut">{detailTotal > detailRows.length ? `menampilkan ${detailRows.length} dari ${detailTotal}` : `${detailRows.length} kunjungan`}</div>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            <SortableTable columns={detailCols} rows={detailRows} initial={{ key: "tgl", dir: "desc" }} head="teal" empty="Tidak ada kunjungan." />
          </div>
        </div>
      </div>

      <div className="text-[11px] text-mut mt-3">
        Realization = jadwal yang sudah di-check-in (maksimal = Plan, konsisten di KPI &amp; chart) · Compliance % = Realization ÷ Plan ·
        EC % = Effective Call (catatan Reorder) ÷ total kunjungan · AR Collection = nominal penagihan (Lunas/Sebagian) yang dicatat salesman ·
        AR pada tabel detail hanya terisi bila ada penagihan.
      </div>
    </>
  );
}
