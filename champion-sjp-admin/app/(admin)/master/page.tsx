import Link from "next/link";
import { q } from "@/lib/db";
import AssignForm from "./AssignForm";
import { deleteAssignment } from "./actions";

export const dynamic = "force-dynamic";

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const FREK: any = { W: "Weekly", BW: "Bi-Weekly", M: "Monthly", C: "Custom" };

function hariLabel(mask: number) {
  const d = HARI.filter((_, i) => mask & (1 << i));
  return d.length ? d.join(", ") : "—";
}

function Tabs({ tab }: { tab: string }) {
  const items = [["assign", "Assign & Frekuensi"], ["salesman", "Master Salesman"], ["customer", "Master Customer"]];
  return (
    <div className="flex gap-1 border-b border-line mb-4">
      {items.map(([k, l]) => (
        <Link key={k} href={`/master?tab=${k}`}
          className={`px-4 py-2.5 font-semibold text-sm border-b-2 ${tab === k ? "text-brand border-brand" : "text-mut border-transparent hover:text-ink"}`}>
          {l}
        </Link>
      ))}
    </div>
  );
}

export default async function MasterPage({ searchParams }: { searchParams: { tab?: string; q?: string } }) {
  const tab = searchParams.tab || "assign";
  const search = (searchParams.q || "").trim();

  const salesmen = await q<any>(`SELECT emp_id, emp_name FROM sjp_employee WHERE is_salesman ORDER BY emp_name`);

  return (
    <>
      <div className="mb-1 text-xl font-bold">Master &amp; Assign</div>
      <div className="text-sm text-mut mb-5">Kelola salesman, customer &amp; assignment kunjungan</div>
      <Tabs tab={tab} />

      {tab === "assign" && (
        <div className="grid grid-cols-[1fr_1.6fr] gap-4 max-[900px]:grid-cols-1">
          <div className="card p-5 self-start">
            <div className="font-bold mb-3">Assign Customer → Salesman</div>
            <AssignForm salesmen={salesmen} />
          </div>
          <div className="card p-5">
            <div className="font-bold mb-3">Daftar Assignment</div>
            <AssignList />
          </div>
        </div>
      )}

      {tab === "salesman" && (
        <div className="card p-5">
          <div className="font-bold mb-3">Master Salesman <span className="text-mut font-normal text-sm">({salesmen.length} · Division MARKETING)</span></div>
          <table className="w-full border-collapse">
            <thead><tr><th className="th">Emp ID</th><th className="th">Nama</th><th className="th">Customer di-assign</th></tr></thead>
            <tbody>
              {await SalesmanRows()}
            </tbody>
          </table>
        </div>
      )}

      {tab === "customer" && <CustomerTab search={search} />}
    </>
  );
}

async function SalesmanRows() {
  const rows = await q<any>(`
    SELECT e.emp_id, e.emp_name, count(a.assign_id) AS n
    FROM sjp_employee e
    LEFT JOIN sjp_assignment a ON a.emp_id = e.emp_id AND a.is_active
    WHERE e.is_salesman GROUP BY e.emp_id, e.emp_name ORDER BY e.emp_name`);
  return rows.map((r) => (
    <tr key={r.emp_id} className="hover:bg-[#fafafa]">
      <td className="td font-mono text-xs">{r.emp_id}</td>
      <td className="td font-semibold">{r.emp_name}</td>
      <td className="td">{r.n}</td>
    </tr>
  ));
}

async function AssignList() {
  const rows = await q<any>(`
    SELECT a.assign_id, a.cust_code, c.cust_name, c.area, a.emp_id, e.emp_name,
           a.frekuensi, a.hari_mask, a.minggu_ke
    FROM sjp_assignment a
    JOIN sjp_customer c ON c.cust_code = a.cust_code
    LEFT JOIN sjp_employee e ON e.emp_id = a.emp_id
    WHERE a.is_active ORDER BY e.emp_name, c.cust_name`);
  if (!rows.length) return <div className="text-sm text-mut">Belum ada assignment. Tambah di form kiri.</div>;
  return (
    <table className="w-full border-collapse">
      <thead><tr><th className="th">Customer</th><th className="th">Salesman</th><th className="th">Frekuensi</th><th className="th">Hari</th><th className="th"></th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.assign_id} className="hover:bg-[#fafafa]">
            <td className="td"><b>{r.cust_name}</b><div className="text-[11px] text-mut">{r.cust_code}</div></td>
            <td className="td">{r.emp_name || r.emp_id}</td>
            <td className="td"><span className="pill p-info">{FREK[r.frekuensi]}</span></td>
            <td className="td text-xs">{hariLabel(r.hari_mask)}{r.minggu_ke ? ` (mgg-${r.minggu_ke})` : ""}</td>
            <td className="td">
              <form action={deleteAssignment}><input type="hidden" name="assign_id" value={r.assign_id} />
                <button className="btn btn-sm">Hapus</button></form>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function CustomerTab({ search }: { search: string }) {
  const rows = await q<any>(`
    SELECT c.cust_code, c.cust_name, c.area, c.phone,
           (g.cust_code IS NOT NULL) AS has_geo,
           ar.ar_outstanding, lo.last_order_date
    FROM sjp_customer c
    LEFT JOIN sjp_customer_geo g ON g.cust_code = c.cust_code
    LEFT JOIN sjp_customer_ar ar ON ar.cust_code = c.cust_code
    LEFT JOIN sjp_customer_lastorder lo ON lo.cust_code = c.cust_code
    WHERE ($1 = '' OR c.cust_name ILIKE '%'||$1||'%' OR c.cust_code ILIKE '%'||$1||'%')
    ORDER BY c.cust_name LIMIT 100`, [search]);
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold">Master Customer <span className="text-mut font-normal text-sm">(maks 100 tampil)</span></div>
        <form className="flex gap-2"><input name="q" defaultValue={search} className="inp !w-56" placeholder="Cari nama / kode" /><input type="hidden" name="tab" value="customer" /><button className="btn btn-sm">Cari</button></form>
      </div>
      <table className="w-full border-collapse">
        <thead><tr><th className="th">Kode</th><th className="th">Nama</th><th className="th">Area</th><th className="th">Telp</th><th className="th">Geo</th><th className="th">AR</th><th className="th">Last Order</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.cust_code} className="hover:bg-[#fafafa]">
              <td className="td font-mono text-xs">{r.cust_code}</td>
              <td className="td font-semibold">{r.cust_name}</td>
              <td className="td">{r.area}</td>
              <td className="td text-xs">{r.phone || "—"}</td>
              <td className="td">{r.has_geo ? <span className="pill p-ok">📍</span> : <span className="pill p-mut">—</span>}</td>
              <td className="td text-right tabular-nums">{r.ar_outstanding ? `Rp ${Number(r.ar_outstanding).toLocaleString("id")}` : "—"}</td>
              <td className="td text-xs">{r.last_order_date ? new Date(r.last_order_date).toLocaleDateString("id") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
