import { q } from "@/lib/db";
import { generateSchedule } from "./actions";

export const dynamic = "force-dynamic";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function mondayOf(dateStr?: string) {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const day = (d.getDay() + 6) % 7; // 0=Senin
  d.setDate(d.getDate() - day);
  return d;
}
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default async function SchedulePage({ searchParams }: { searchParams: { week?: string } }) {
  const monday = mondayOf(searchParams.week);
  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
  const start = ymd(days[0]); const end = ymd(days[5]);

  const rows = await q<any>(`
    SELECT s.tgl::text AS tgl, s.emp_id, e.emp_name, s.cust_code, c.cust_name, s.status
    FROM sjp_schedule s
    LEFT JOIN sjp_employee e ON e.emp_id = s.emp_id
    LEFT JOIN sjp_customer c ON c.cust_code = s.cust_code
    WHERE s.tgl BETWEEN $1 AND $2
    ORDER BY e.emp_name, s.tgl`, [start, end]);

  // group by emp -> day
  const emps = new Map<string, { name: string; cells: any[][] }>();
  for (const r of rows) {
    if (!emps.has(r.emp_id)) emps.set(r.emp_id, { name: r.emp_name || r.emp_id, cells: [[], [], [], [], [], []] });
    const di = days.findIndex((d) => ymd(d) === r.tgl);
    if (di >= 0) emps.get(r.emp_id)!.cells[di].push(r);
  }

  const prev = ymd(new Date(monday.getTime() - 7 * 86400000));
  const next = ymd(new Date(monday.getTime() + 7 * 86400000));

  return (
    <>
      <div className="mb-1 text-xl font-bold">Generate &amp; Kalender SJP</div>
      <div className="text-sm text-mut mb-5">Buat jadwal harian Senin–Sabtu dari assignment + frekuensi</div>

      <div className="card p-5 mb-4 flex items-end gap-3 flex-wrap">
        <form className="flex items-end gap-2">
          <div><label className="lbl">Minggu (pilih tanggal Senin)</label>
            <input type="date" name="week" defaultValue={start} className="inp !w-48" /></div>
          <button className="btn">Lihat</button>
        </form>
        <form action={generateSchedule}>
          <input type="hidden" name="week_start" value={start} />
          <button className="btn btn-pri">⚙ Generate Jadwal Minggu Ini</button>
        </form>
        <div className="ml-auto flex gap-2">
          <a className="btn btn-sm" href={`/schedule?week=${prev}`}>‹ Minggu lalu</a>
          <a className="btn btn-sm" href={`/schedule?week=${next}`}>Minggu depan ›</a>
        </div>
      </div>

      <div className="card p-5 overflow-x-auto">
        <div className="font-bold mb-3">
          Kalender {days[0].toLocaleDateString("id")} – {days[5].toLocaleDateString("id")}
          <span className="text-mut font-normal text-sm"> · {rows.length} kunjungan terjadwal</span>
        </div>
        {emps.size === 0 ? (
          <div className="text-sm text-mut">Belum ada jadwal minggu ini. Klik <b>Generate</b> (pastikan sudah ada assignment).</div>
        ) : (
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr>
                <th className="th w-32">Salesman</th>
                {days.map((d, i) => <th key={i} className="th">{HARI[i]} {d.getDate()}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...emps.entries()].map(([emp, v]) => (
                <tr key={emp}>
                  <td className="td font-semibold bg-[#fafafa] sticky left-0">{v.name}</td>
                  {v.cells.map((cell, i) => (
                    <td key={i} className="td align-top">
                      {cell.map((x: any, j: number) => (
                        <div key={j} className="bg-brand-soft border-l-2 border-brand rounded px-2 py-1 mb-1 text-[11px]">
                          <div className="font-semibold">{x.cust_name || x.cust_code}</div>
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
