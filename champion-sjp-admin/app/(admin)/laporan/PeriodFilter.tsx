import Link from "next/link";
import type { PeriodSP } from "./period";

// Filter periode bersama untuk halaman Laporan (GET form, tanpa JS).
// Default per bulan; isi "Dari/Sampai" untuk mode rentang tanggal.
export default function PeriodFilter({
  action, sp, salesmen, label,
}: {
  action: string;
  sp: PeriodSP;
  salesmen: { emp_id: string; emp_name: string }[];
  label: string;
}) {
  return (
    <form method="GET" action={action} className="card p-4 mb-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="lbl">Bulan</label>
        <input type="month" name="m" defaultValue={sp.m || ""} className="inp !w-40 !py-1.5 text-sm" />
      </div>
      <div className="text-xs text-mut pb-2">atau</div>
      <div>
        <label className="lbl">Dari</label>
        <input type="date" name="from" defaultValue={sp.from || ""} className="inp !w-40 !py-1.5 text-sm" />
      </div>
      <div>
        <label className="lbl">Sampai</label>
        <input type="date" name="to" defaultValue={sp.to || ""} className="inp !w-40 !py-1.5 text-sm" />
      </div>
      <div>
        <label className="lbl">Salesman</label>
        <select name="femp" defaultValue={sp.femp || ""} className="inp !w-48 !py-1.5 text-sm">
          <option value="">Semua</option>
          {salesmen.map((s) => (
            <option key={s.emp_id} value={s.emp_id}>{s.emp_name}</option>
          ))}
        </select>
      </div>
      <button className="btn btn-pri btn-sm" type="submit">Terapkan</button>
      <Link href={action} className="btn btn-sm">Reset</Link>
      <div className="w-full text-xs text-mut">Periode aktif: <b>{label}</b> <span className="opacity-70">(isi Dari &amp; Sampai untuk rentang tanggal; kosongkan untuk memakai Bulan)</span></div>
    </form>
  );
}
