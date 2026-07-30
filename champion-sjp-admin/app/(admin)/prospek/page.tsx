import { q } from "@/lib/db";
import { linkProspek, arsipProspek } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function ProspekPage() {
  const rows = await q<any>(`
    SELECT p.*, e.emp_name FROM sjp_prospect p
    LEFT JOIN sjp_employee e ON e.emp_id = p.emp_id
    WHERE p.status <> 'ARSIP' ORDER BY p.created_at DESC`);

  return (
    <>
      <div className="mb-1 text-xl font-bold">Prospek — Data Lokal SJP</div>
      <div className="text-sm text-mut mb-5">Customer baru hasil kunjungan OOS. Bukan master customer (master di core system).</div>

      <div className="card p-5 border-l-4 border-info">
        {rows.length === 0 ? (
          <div className="text-sm text-mut">Belum ada prospek. Prospek muncul saat salesman check-in OOS "Prospek/customer baru".</div>
        ) : (
          <table className="w-full border-collapse">
            <thead><tr>
              <th className="th">ID Prospek</th><th className="th">Nama Usaha</th><th className="th">Alamat</th>
              <th className="th">PIC/HP</th><th className="th">Salesman</th><th className="th">Status</th><th className="th">Aksi</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.prospek_id} className="hover:bg-[#fafafa]">
                  <td className="td font-mono text-xs">{r.prospek_id}</td>
                  <td className="td font-semibold">{r.nama_usaha}</td>
                  <td className="td text-xs">{r.alamat || "—"}</td>
                  <td className="td text-xs">{[r.pic, r.hp].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="td">{r.emp_name || r.emp_id || "—"}</td>
                  <td className="td">
                    <span className={`pill ${r.status === "TAUTKAN" ? "p-ok" : "p-warn"}`}>
                      {r.status === "TAUTKAN" ? `→ ${r.linked_cust_code}` : "Belum jadi customer"}
                    </span>
                  </td>
                  <td className="td whitespace-nowrap">
                    <form action={linkProspek} className="inline-flex gap-1 items-center">
                      <input type="hidden" name="prospek_id" value={r.prospek_id} />
                      <input name="cust_code" className="inp !w-28 !py-1" placeholder="Cust_Code" />
                      <SubmitButton className="btn btn-sm" pendingText="…">🔗 Tautkan</SubmitButton>
                    </form>
                    <form action={arsipProspek} className="inline ml-1">
                      <input type="hidden" name="prospek_id" value={r.prospek_id} />
                      <SubmitButton className="btn btn-sm" pendingText="…">Arsip</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card p-4 mt-4 bg-[#e8f0fe] border-[#c7dbfc]">
        <div className="text-sm text-[#1e40af]">ℹ️ Master customer di-input di <b>core system MPS</b> (read-only). SJP tidak membuat customer — prospek cukup ditautkan bila core sudah membuatnya.</div>
      </div>
    </>
  );
}
