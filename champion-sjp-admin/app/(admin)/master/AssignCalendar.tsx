import Link from "next/link";
import { q } from "@/lib/db";
import { scheduledOn, bizDow } from "@/lib/scheduleRule";

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const HARI = ["Sen","Sel","Rab","Kam","Jum","Sab"];

// preview jadwal 1 salesman dalam 1 bulan (Sen–Sab), dihitung dari assignment aktif
export default async function AssignCalendar({
  emp, ym, salesmen,
}: {
  emp: string;
  ym: string; // "YYYY-MM"
  salesmen: { emp_id: string; emp_name: string }[];
}) {
  // tentukan tahun/bulan (default bulan berjalan)
  const now = new Date();
  let [yy, mm] = ym && /^\d{4}-\d{2}$/.test(ym)
    ? ym.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  const year = yy, month = mm; // month 1..12

  const prev = new Date(year, month - 2, 1); // bulan sebelumnya
  const next = new Date(year, month, 1);     // bulan berikutnya
  const ymOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const link = (e: string, y: string) =>
    `/master?tab=assign&cal_emp=${encodeURIComponent(e)}&cal_ym=${y}`;

  // ambil assignment salesman terpilih
  const assigns = emp
    ? await q<any>(
        `SELECT a.frekuensi, a.hari_mask, a.minggu_ke, a.cust_code, c.cust_name
           FROM sjp_assignment a JOIN sjp_customer c ON c.cust_code=a.cust_code
          WHERE a.is_active AND a.emp_id=$1 ORDER BY c.cust_name`, [emp])
    : [];

  // bangun matriks minggu (kolom Sen..Sab)
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks: ({ day: number; custs: string[] } | null)[][] = [];
  let cur: ({ day: number; custs: string[] } | null)[] = new Array(6).fill(null);
  let started = false;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dow = bizDow(d); // 0=Sen..6=Min
    if (dow === 6) { // Minggu → tutup minggu berjalan
      if (started) { weeks.push(cur); cur = new Array(6).fill(null); started = false; }
      continue;
    }
    if (dow === 0 && started) { weeks.push(cur); cur = new Array(6).fill(null); }
    const custs = assigns.filter((a: any) => scheduledOn(a, d)).map((a: any) => a.cust_name);
    cur[dow] = { day, custs };
    started = true;
  }
  if (started) weeks.push(cur);

  const totalVisit = weeks.flat().reduce((s, c) => s + (c?.custs.length || 0), 0);

  return (
    <div className="card p-4 mt-4">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="font-bold">🗓️ Preview Kalender</div>
        <div className="flex items-center gap-1 text-sm">
          <Link href={link(emp, ymOf(prev))} className="btn btn-sm">‹</Link>
          <span className="font-semibold min-w-[130px] text-center">{BULAN[month - 1]} {year}</span>
          <Link href={link(emp, ymOf(next))} className="btn btn-sm">›</Link>
        </div>
      </div>

      {/* pemilih salesman (GET, tanpa JS) */}
      <form method="GET" action="/master" className="flex items-center gap-2 mb-3">
        <input type="hidden" name="tab" value="assign" />
        <input type="hidden" name="cal_ym" value={`${year}-${String(month).padStart(2, "0")}`} />
        <select name="cal_emp" defaultValue={emp} className="inp !py-1.5 text-sm flex-1">
          <option value="">— pilih salesman —</option>
          {salesmen.map((s) => (
            <option key={s.emp_id} value={s.emp_id}>{s.emp_name} ({s.emp_id})</option>
          ))}
        </select>
        <button className="btn btn-sm" type="submit">Lihat</button>
      </form>

      {!emp ? (
        <div className="text-sm text-mut text-center py-6">
          Pilih salesman untuk melihat jadwal kunjungan sebulan (hasil dari assignment &amp; frekuensi).
        </div>
      ) : assigns.length === 0 ? (
        <div className="text-sm text-mut text-center py-6">Belum ada assignment aktif untuk salesman ini.</div>
      ) : (
        <>
          <div className="text-[11px] text-mut mb-2">{assigns.length} customer di-assign · {totalVisit} kunjungan bulan ini</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>{HARI.map((h) => <th key={h} className="border border-line bg-[#f6f7f9] py-1 font-semibold text-mut">{h}</th>)}</tr>
              </thead>
              <tbody>
                {weeks.map((w, wi) => (
                  <tr key={wi}>
                    {w.map((cell, ci) => (
                      <td key={ci} className="border border-line align-top p-1 h-16 w-[16.6%]">
                        {cell ? (
                          <>
                            <div className={`font-bold text-[11px] mb-0.5 ${cell.custs.length ? "text-ink" : "text-mut"}`}>{cell.day}</div>
                            <div className="space-y-0.5">
                              {cell.custs.slice(0, 3).map((n, i) => (
                                <div key={i} className="truncate rounded bg-brand-soft text-brand px-1 py-[1px] leading-tight" title={n}>{n}</div>
                              ))}
                              {cell.custs.length > 3 ? <div className="text-mut">+{cell.custs.length - 3} lagi</div> : null}
                            </div>
                          </>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-mut mt-2">Preview dihitung dari assignment aktif. Untuk membuat jadwal resmi, buka menu <b>Generate &amp; Kalender</b>.</div>
        </>
      )}
    </div>
  );
}
