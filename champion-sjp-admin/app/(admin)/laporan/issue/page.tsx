import Link from "next/link";
import { q, q1 } from "@/lib/db";
import { resolvePeriod, type PeriodSP } from "../period";
import PeriodFilter from "../PeriodFilter";
import SortableTable, { type Col } from "../SortableTable";
import BarChart, { type BarDatum } from "../Charts";

export const dynamic = "force-dynamic";


function Tabs() {
  return (
    <div className="flex gap-2 mb-4 text-sm">
      <Link href="/laporan/produktivitas" className="btn btn-sm">Produktivitas</Link>
      <Link href="/laporan/issue" className="btn btn-pri btn-sm">Issue Lapangan</Link>
    </div>
  );
}

export default async function IssuePage({ searchParams }: { searchParams: PeriodSP }) {
  const { first, last, label } = resolvePeriod(searchParams);
  const femp = searchParams.femp || "";
  const salesmen = await q<any>(`SELECT emp_id, emp_name FROM sjp_employee WHERE is_salesman ORDER BY emp_name`);

  // 1) Catatan bermasalah (LOV-03 Stok kosong, 04 Komplain, 05 Toko tutup, 06 Kompetitor)
  const noteSummary = await q<any>(`
    SELECT l.kode, l.teks, count(*) n
    FROM sjp_visit_log v
     JOIN sjp_lov l ON l.lov_id = ANY(COALESCE(v.catatan_lov_ids, ARRAY[v.catatan_lov_id])) AND l.kode IN ('LOV-03','LOV-04','LOV-05','LOV-06')
    WHERE v.tgl BETWEEN $1 AND $2 AND ($3='' OR v.emp_id=$3)
    GROUP BY l.kode, l.teks ORDER BY n DESC`, [first, last, femp]);

  const noteDetail = await q<any>(`
    SELECT v.tgl::text tgl, to_char(v.checkin_dt,'HH24:MI') jam, e.emp_name,
           COALESCE(c.cust_name, p.nama_usaha, v.cust_code, v.prospek_id) nama,
           string_agg(DISTINCT l.teks, ', ') jenis, v.free_text
    FROM sjp_visit_log v
     JOIN sjp_lov l ON l.lov_id = ANY(COALESCE(v.catatan_lov_ids, ARRAY[v.catatan_lov_id])) AND l.kode IN ('LOV-03','LOV-04','LOV-05','LOV-06')
     LEFT JOIN sjp_employee e ON e.emp_id=v.emp_id
     LEFT JOIN sjp_customer c ON c.cust_code=v.cust_code
     LEFT JOIN sjp_prospect p ON p.prospek_id=v.prospek_id
    WHERE v.tgl BETWEEN $1 AND $2 AND ($3='' OR v.emp_id=$3)
    GROUP BY v.visit_id, v.tgl, v.checkin_dt, e.emp_name, c.cust_name, p.nama_usaha, v.cust_code, v.prospek_id, v.free_text
    ORDER BY v.checkin_dt DESC LIMIT 100`, [first, last, femp]);

  // 2) Kunjungan terlewat (jadwal lampau tanpa visit; MISSED tak tersimpan → diturunkan)
  const missCount = await q1<any>(`
    SELECT count(*) n FROM sjp_schedule s LEFT JOIN sjp_visit_log v ON v.sched_id=s.sched_id
    WHERE s.tgl BETWEEN $1 AND LEAST($2::date, CURRENT_DATE - 1) AND v.visit_id IS NULL AND ($3='' OR s.emp_id=$3)`, [first, last, femp]);
  const missed = await q<any>(`
    SELECT s.tgl::text tgl, e.emp_name, c.cust_name
    FROM sjp_schedule s
     JOIN sjp_employee e ON e.emp_id=s.emp_id
     JOIN sjp_customer c ON c.cust_code=s.cust_code
     LEFT JOIN sjp_visit_log v ON v.sched_id=s.sched_id
    WHERE s.tgl BETWEEN $1 AND LEAST($2::date, CURRENT_DATE - 1) AND v.visit_id IS NULL AND ($3='' OR s.emp_id=$3)
    ORDER BY s.tgl DESC, e.emp_name LIMIT 100`, [first, last, femp]);

  // 3a) Absensi belum lengkap (hari lampau)
  const absGap = await q<any>(`
    SELECT e.emp_id, e.emp_name,
     (SELECT count(DISTINCT s.tgl) FROM sjp_schedule s
        WHERE s.emp_id=e.emp_id AND s.tgl BETWEEN $1 AND LEAST($2::date, CURRENT_DATE - 1)
          AND NOT EXISTS (SELECT 1 FROM sjp_attendance a WHERE a.emp_id=e.emp_id AND a.tgl=s.tgl AND a.mode='MASUK')) belum_absen,
     (SELECT count(*) FROM sjp_attendance am
        WHERE am.emp_id=e.emp_id AND am.mode='MASUK' AND am.tgl BETWEEN $1 AND LEAST($2::date, CURRENT_DATE - 1)
          AND NOT EXISTS (SELECT 1 FROM sjp_attendance ap WHERE ap.emp_id=e.emp_id AND ap.tgl=am.tgl AND ap.mode='PULANG')) belum_pulang
    FROM sjp_employee e WHERE e.is_salesman AND ($3='' OR e.emp_id=$3)
    ORDER BY e.emp_name`, [first, last, femp]);
  const absRows = absGap.filter((r: any) => Number(r.belum_absen) > 0 || Number(r.belum_pulang) > 0);

  // 3b) AR overdue (snapshot terbaru, bukan per periode)
  const arOverdue = await q<any>(`
    SELECT c.cust_code, c.cust_name,
      (SELECT e.emp_name FROM sjp_assignment a JOIN sjp_employee e ON e.emp_id=a.emp_id
         WHERE a.cust_code=c.cust_code AND a.is_active ORDER BY a.assign_id LIMIT 1) emp_name,
      ar.ar_outstanding, ar.ar_overdue
    FROM sjp_customer_ar ar JOIN sjp_customer c ON c.cust_code=ar.cust_code
    WHERE ar.ar_overdue > 0
      AND ($1='' OR EXISTS(SELECT 1 FROM sjp_assignment a WHERE a.cust_code=c.cust_code AND a.is_active AND a.emp_id=$1))
    ORDER BY ar.ar_overdue DESC LIMIT 20`, [femp]);

  return (
    <>
      <div className="mb-1 text-xl font-bold">Laporan Issue Lapangan</div>
      <div className="text-sm text-mut mb-4">Temuan yang perlu ditindaklanjuti dari kunjungan salesman</div>
      <Tabs />
      <PeriodFilter action="/laporan/issue" sp={searchParams} salesmen={salesmen} label={label} />

      {/* 1. Catatan bermasalah */}
      <div className="card p-5 mb-4">
        <div className="font-bold mb-2">📝 Catatan Bermasalah <span className="text-mut font-normal text-sm">({noteDetail.length} kunjungan)</span></div>
        {noteSummary.length ? (
          <div className="mb-3">
            <BarChart
              data={noteSummary.map((s: any): BarDatum => ({ label: s.teks, value: Number(s.n), tone: "warn" }))}
              labelWidth="11rem"
            />
          </div>
        ) : null}
        <SortableTable
          columns={[
            { key: "waktu", label: "Tgl", align: "left", fmt: "datetime" },
            { key: "emp_name", label: "Salesman", align: "left", fmt: "text" },
            { key: "nama", label: "Customer", align: "left", fmt: "text" },
            { key: "jenis", label: "Jenis", align: "left", fmt: "tag" },
            { key: "free_text", label: "Catatan", align: "left", fmt: "text" },
          ] as Col[]}
          rows={noteDetail.map((r: any, i: number) => ({
            __key: i, waktu: `${r.tgl} ${r.jam}`, emp_name: r.emp_name, nama: r.nama, jenis: r.jenis, free_text: r.free_text,
          }))}
          initial={{ key: "waktu", dir: "desc" }}
          empty="Tidak ada catatan bermasalah pada periode ini."
        />
      </div>

      {/* 2. Kunjungan terlewat */}
      <div className="card p-5 mb-4">
        <div className="font-bold mb-2">🚫 Kunjungan Terlewat <span className="text-mut font-normal text-sm">({Number(missCount?.n || 0)} jadwal)</span></div>
        <div className="text-[11px] text-mut mb-2">Jadwal pada hari yang sudah lewat tanpa check-in.</div>
        <SortableTable
          columns={[
            { key: "tgl", label: "Tgl", align: "left", fmt: "date" },
            { key: "emp_name", label: "Salesman", align: "left", fmt: "text" },
            { key: "cust_name", label: "Customer", align: "left", fmt: "text" },
          ] as Col[]}
          rows={missed.map((r: any, i: number) => ({ __key: i, tgl: r.tgl, emp_name: r.emp_name, cust_name: r.cust_name }))}
          initial={{ key: "tgl", dir: "desc" }}
          empty="Tidak ada kunjungan terlewat pada periode ini."
        />
        {Number(missCount?.n || 0) > missed.length ? <div className="text-[11px] text-mut mt-2">Menampilkan 100 teratas dari {Number(missCount?.n)} jadwal terlewat.</div> : null}
      </div>

      {/* 3a. Absensi belum lengkap */}
      <div className="card p-5 mb-4">
        <div className="font-bold mb-2">🕒 Absensi Belum Lengkap <span className="text-mut font-normal text-sm">({absRows.length} salesman)</span></div>
        <SortableTable
          columns={[
            { key: "emp_name", label: "Salesman", align: "left", fmt: "text" },
            { key: "belum_absen", label: "Belum absen masuk (hari)", align: "center", fmt: "int" },
            { key: "belum_pulang", label: "Belum absen pulang (hari)", align: "center", fmt: "int" },
          ] as Col[]}
          rows={absRows.map((r: any) => ({ __key: r.emp_id, emp_name: r.emp_name, belum_absen: Number(r.belum_absen), belum_pulang: Number(r.belum_pulang) }))}
          initial={{ key: "belum_absen", dir: "desc" }}
          empty="Semua absensi lengkap pada periode ini."
        />
        <div className="text-[11px] text-mut mt-2">Belum absen masuk = hari berjadwal tanpa absen masuk. Belum pulang = ada absen masuk tapi tak ada absen pulang (hari lampau).</div>
      </div>

      {/* 3b. AR overdue */}
      <div className="card p-5 mb-4">
        <div className="font-bold mb-2">💰 AR Overdue Tertinggi <span className="text-mut font-normal text-sm">(snapshot terbaru)</span></div>
        <SortableTable
          columns={[
            { key: "cust_name", label: "Customer", align: "left", fmt: "text" },
            { key: "emp_name", label: "PIC Salesman", align: "left", fmt: "text" },
            { key: "ar_outstanding", label: "Outstanding", align: "right", fmt: "rp" },
            { key: "ar_overdue", label: "Overdue", align: "right", fmt: "rp" },
          ] as Col[]}
          rows={arOverdue.map((r: any) => ({ __key: r.cust_code, cust_name: r.cust_name, emp_name: r.emp_name, ar_outstanding: Number(r.ar_outstanding), ar_overdue: Number(r.ar_overdue) }))}
          initial={{ key: "ar_overdue", dir: "desc" }}
          empty="Tidak ada AR overdue."
        />
        <div className="text-[11px] text-mut mt-2">AR = snapshot terbaru dari sinkronisasi DWH (bukan per rentang periode).</div>
      </div>
    </>
  );
}
