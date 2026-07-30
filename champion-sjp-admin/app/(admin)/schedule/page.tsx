import Link from "next/link";
import { q, q1 } from "@/lib/db";
import GenerateButton from "./GenerateButton";

export const dynamic = "force-dynamic";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const HARI3 = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function mondayOf(dateStr?: string) {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(d.getDate() + n); return x; };

const STATUS: any = {
  PLANNED: { cls: "bg-brand-soft border-brand", label: "Terjadwal" },
  DONE: { cls: "bg-[#e7f6ec] border-ok", label: "Selesai" },
  MISSED: { cls: "bg-[#fdeaea] border-bad", label: "Terlewat" },
};

export default async function SchedulePage({ searchParams }: { searchParams: { week?: string; emp?: string } }) {
  const monday = mondayOf(searchParams.week);
  const days = Array.from({ length: 6 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
  const start = ymd(days[0]); const end = ymd(days[5]);
  const todayStr = ymd(new Date());

  const salesmen = await q<any>(`SELECT emp_id, emp_name FROM sjp_employee WHERE is_salesman ORDER BY emp_name`);
  let emp = (searchParams.emp || "").trim();
  const isAll = emp.toUpperCase() === "ALL";
  if (!emp) {
    const firstWithSched = await q1<any>(`SELECT emp_id FROM sjp_schedule WHERE tgl BETWEEN $1 AND $2 ORDER BY emp_id LIMIT 1`, [start, end]);
    emp = firstWithSched?.emp_id || salesmen[0]?.emp_id || "";
  }

  const totalWeek = await q1<any>(`SELECT count(*) n FROM sjp_schedule WHERE tgl BETWEEN $1 AND $2`, [start, end]);
  const prev = ymd(addDays(monday, -7));
  const next = ymd(addDays(monday, 7));
  const qs = (w: string, e: string) => `/schedule?week=${w}&emp=${e}`;
  const rangeLabel = `${days[0].getDate()} ${BULAN[days[0].getMonth()]} – ${days[5].getDate()} ${BULAN[days[5].getMonth()]} ${days[5].getFullYear()}`;

  // ===== Toolbar (dipakai kedua mode) =====
  const toolbar = (
    <div className="card p-4 mb-4 flex items-center gap-3 flex-wrap">
      <form className="flex items-end gap-2">
        <div>
          <label className="lbl">Salesman</label>
          <select name="emp" defaultValue={isAll ? "ALL" : emp} className="inp !w-52">
            <option value="ALL">— Semua Salesman (overview) —</option>
            {salesmen.map((s) => <option key={s.emp_id} value={s.emp_id}>{s.emp_name}</option>)}
          </select>
        </div>
        <input type="hidden" name="week" value={start} />
        <button className="btn">Tampilkan</button>
      </form>
      <div className="flex items-center gap-2 ml-auto">
        <Link className="btn btn-sm" href={qs(prev, isAll ? "ALL" : emp)}>‹ Sebelumnya</Link>
        <Link className="btn btn-sm" href={qs(ymd(mondayOf()), isAll ? "ALL" : emp)}>Minggu ini</Link>
        <Link className="btn btn-sm" href={qs(next, isAll ? "ALL" : emp)}>Berikutnya ›</Link>
      </div>
      <GenerateButton weekStart={start} />
    </div>
  );

  const legend = (
    <div className="flex gap-3 text-xs text-mut">
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-soft border border-brand inline-block"></span> Terjadwal</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#e7f6ec] border border-ok inline-block"></span> Selesai</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#fdeaea] border border-bad inline-block"></span> Terlewat</span>
    </div>
  );

  // ============ MODE: SEMUA SALESMAN (matrix 1 row per salesman) ============
  if (isAll) {
    const rows = await q<any>(`
      SELECT s.emp_id, e.emp_name, s.tgl::text AS tgl, s.status, c.cust_name, s.cust_code
      FROM sjp_schedule s
      LEFT JOIN sjp_employee e ON e.emp_id = s.emp_id
      LEFT JOIN sjp_customer c ON c.cust_code = s.cust_code
      WHERE s.tgl BETWEEN $1 AND $2
      ORDER BY e.emp_name, s.tgl, c.cust_name`, [start, end]);

    const map = new Map<string, { name: string; cells: any[][] }>();
    for (const r of rows) {
      if (!map.has(r.emp_id)) map.set(r.emp_id, { name: r.emp_name || r.emp_id, cells: [[], [], [], [], [], []] });
      const di = days.findIndex((d) => ymd(d) === r.tgl);
      if (di >= 0) map.get(r.emp_id)!.cells[di].push(r);
    }

    return (
      <>
        <div className="mb-1 text-xl font-bold">Kalender Kunjungan</div>
        <div className="text-sm text-mut mb-5">Overview semua salesman — 1 baris/salesman, Senin–Sabtu</div>
        {toolbar}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-sm text-mut">{rangeLabel} · {map.size} salesman aktif · {Number(totalWeek?.n || 0)} kunjungan</div>
          {legend}
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr>
                <th className="th sticky left-0 bg-white z-10 w-40">Salesman</th>
                {days.map((d, i) => (
                  <th key={i} className={`th text-center ${ymd(d) === todayStr ? "text-brand" : ""}`}>
                    {HARI3[i]} {d.getDate()}/{d.getMonth() + 1}
                  </th>
                ))}
                <th className="th text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {map.size === 0 ? (
                <tr><td className="td text-mut" colSpan={8}>Belum ada jadwal minggu ini. Klik Generate.</td></tr>
              ) : [...map.entries()].map(([id, v]) => {
                const tot = v.cells.reduce((a, c) => a + c.length, 0);
                return (
                  <tr key={id} className="hover:bg-[#fafafa] align-top">
                    <td className="td font-semibold sticky left-0 bg-white">
                      <Link href={qs(start, id)} className="text-ink hover:text-brand">{v.name}</Link>
                    </td>
                    {v.cells.map((cell, i) => (
                      <td key={i} className={`td ${ymd(days[i]) === todayStr ? "bg-brand-soft/40" : ""}`}>
                        {cell.length === 0 ? <span className="text-mut">·</span> :
                          <div className="space-y-1">
                            {cell.map((e: any, j: number) => {
                              const st = STATUS[e.status] || STATUS.PLANNED;
                              return <div key={j} className={`rounded border-l-2 px-1.5 py-0.5 text-[10.5px] leading-tight ${st.cls}`}>{e.cust_name || e.cust_code}</div>;
                            })}
                          </div>}
                      </td>
                    ))}
                    <td className="td text-center font-bold">{tot}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  // ============ MODE: PER SALESMAN (week calendar) ============
  const empName = salesmen.find((s) => s.emp_id === emp)?.emp_name || emp;
  const rows = await q<any>(`
    SELECT s.tgl::text AS tgl, s.cust_code, c.cust_name, s.status, s.jam_target::text AS jam
    FROM sjp_schedule s LEFT JOIN sjp_customer c ON c.cust_code = s.cust_code
    WHERE s.emp_id = $1 AND s.tgl BETWEEN $2 AND $3
    ORDER BY s.tgl, c.cust_name`, [emp, start, end]);
  const byDay: any[][] = [[], [], [], [], [], []];
  for (const r of rows) { const di = days.findIndex((d) => ymd(d) === r.tgl); if (di >= 0) byDay[di].push(r); }

  return (
    <>
      <div className="mb-1 text-xl font-bold">Kalender Kunjungan</div>
      <div className="text-sm text-mut mb-5">Jadwal mingguan Senin–Sabtu per salesman</div>
      {toolbar}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-lg font-bold">{empName}</div>
          <div className="text-sm text-mut">{rangeLabel} · {rows.length} kunjungan · total tim {Number(totalWeek?.n || 0)}</div>
        </div>
        {legend}
      </div>

      <div className="grid grid-cols-6 gap-3 max-[1100px]:grid-cols-3 max-[640px]:grid-cols-1">
        {days.map((d, i) => {
          const isToday = ymd(d) === todayStr; const evs = byDay[i];
          return (
            <div key={i} className={`card overflow-hidden ${isToday ? "ring-2 ring-brand" : ""}`}>
              <div className={`px-3 py-2 border-b border-line ${isToday ? "bg-brand text-white" : "bg-[#fafafa]"}`}>
                <div className="text-[11px] uppercase tracking-wide opacity-80">{HARI[i]}</div>
                <div className="text-lg font-bold leading-none">{d.getDate()} <span className="text-xs font-normal opacity-80">{BULAN[d.getMonth()]}</span></div>
              </div>
              <div className="p-2 space-y-1.5 min-h-[120px]">
                {evs.length === 0 ? <div className="text-[11px] text-mut text-center py-4">—</div> :
                  evs.map((e, j) => {
                    const st = STATUS[e.status] || STATUS.PLANNED;
                    return (
                      <div key={j} className={`rounded-md border-l-2 px-2 py-1.5 text-[11px] leading-tight ${st.cls}`}>
                        <div className="font-semibold text-ink">{e.cust_name || e.cust_code}</div>
                        <div className="text-mut">{e.jam ? e.jam.slice(0, 5) + " · " : ""}{st.label}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="card p-5 mt-4 text-sm text-mut">Belum ada jadwal untuk {empName} minggu ini. Klik <b>Generate Jadwal Minggu Ini</b> atau pilih salesman lain.</div>
      ) : null}
    </>
  );
}
