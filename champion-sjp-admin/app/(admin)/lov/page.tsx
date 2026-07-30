import { q } from "@/lib/db";
import { addLov, toggleLov } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

type Lov = {
  lov_id: number; tipe: string; kode: string; teks: string;
  kategori: string | null; perlu_followup: boolean; perlu_approval: boolean; is_active: boolean;
};

function Table({ rows }: { rows: Lov[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="th">Kode</th><th className="th">Teks</th><th className="th">Kategori</th>
          <th className="th">Follow-up</th><th className="th">Approval</th><th className="th">Status</th><th className="th"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.lov_id} className="hover:bg-[#fafafa]">
            <td className="td font-mono text-xs">{r.kode}</td>
            <td className="td font-semibold">{r.teks}</td>
            <td className="td">{r.kategori ? <span className="pill p-mut">{r.kategori}</span> : "—"}</td>
            <td className="td">{r.perlu_followup ? "Ya" : "—"}</td>
            <td className="td">{r.perlu_approval ? "Ya" : "—"}</td>
            <td className="td">
              <span className={`pill ${r.is_active ? "p-ok" : "p-mut"}`}>{r.is_active ? "Aktif" : "Nonaktif"}</span>
            </td>
            <td className="td">
              <form action={toggleLov}>
                <input type="hidden" name="lov_id" value={r.lov_id} />
                <SubmitButton className="btn btn-sm" pendingText="…">{r.is_active ? "Nonaktifkan" : "Aktifkan"}</SubmitButton>
              </form>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function LovPage() {
  const rows = await q<Lov>(`SELECT * FROM sjp_lov ORDER BY tipe, kode`);
  const catatan = rows.filter((r) => r.tipe === "CATATAN");
  const oos = rows.filter((r) => r.tipe === "OOS");

  return (
    <>
      <div className="mb-1 text-xl font-bold">LOV Catatan</div>
      <div className="text-sm text-mut mb-5">List of Value: catatan kunjungan &amp; alasan luar jadwal (OOS)</div>

      <div className="grid grid-cols-[1.7fr_1fr] gap-4 max-[900px]:grid-cols-1">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="font-bold mb-3">Catatan Kunjungan</div>
            <Table rows={catatan} />
          </div>
          <div className="card p-5">
            <div className="font-bold mb-3">Alasan Luar Jadwal (OOS)</div>
            <Table rows={oos} />
          </div>
        </div>

        <div className="card p-5 self-start">
          <div className="font-bold mb-3">Tambah / Edit LOV</div>
          <form action={addLov} className="space-y-3">
            <div><label className="lbl">Tipe</label>
              <select name="tipe" className="inp"><option value="CATATAN">Catatan Kunjungan</option><option value="OOS">Alasan OOS</option></select></div>
            <div><label className="lbl">Kode</label><input name="kode" className="inp" placeholder="LOV-09 / OOS-07" /></div>
            <div><label className="lbl">Teks</label><input name="teks" className="inp" placeholder="mis. Reorder produk" /></div>
            <div><label className="lbl">Kategori</label><input name="kategori" className="inp" placeholder="Info / Order / OOS" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="perlu_followup" /> Perlu follow-up</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="perlu_approval" /> Perlu approval</label>
            <SubmitButton className="btn btn-pri w-full justify-center">Simpan LOV</SubmitButton>
            <p className="text-[11px] text-mut">Kode sama (tipe+kode) akan menimpa data lama.</p>
          </form>
        </div>
      </div>
    </>
  );
}
