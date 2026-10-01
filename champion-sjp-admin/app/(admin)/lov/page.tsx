import Link from "next/link";
import { q } from "@/lib/db";
import { addLov, toggleLov, addKategori } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

type Lov = {
  lov_id: number; tipe: string; kode: string; teks: string;
  kategori: string | null; perlu_followup: boolean; perlu_approval: boolean; is_active: boolean;
};

function Table({ rows, editId }: { rows: Lov[]; editId: number | null }) {
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
          <tr key={r.lov_id} className={`hover:bg-[#fafafa] ${editId === r.lov_id ? "bg-brand-soft" : ""}`}>
            <td className="td font-mono text-xs">{r.kode}</td>
            <td className="td font-semibold">{r.teks}</td>
            <td className="td">{r.kategori ? <span className="pill p-mut">{r.kategori}</span> : "—"}</td>
            <td className="td">{r.perlu_followup ? "Ya" : "—"}</td>
            <td className="td">{r.perlu_approval ? "Ya" : "—"}</td>
            <td className="td">
              <span className={`pill ${r.is_active ? "p-ok" : "p-mut"}`}>{r.is_active ? "Aktif" : "Nonaktif"}</span>
            </td>
            <td className="td whitespace-nowrap">
              <Link href={`/lov?edit=${r.lov_id}`} className="btn btn-sm">✎ Edit</Link>{" "}
              <form action={toggleLov} className="inline">
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

export default async function LovPage({ searchParams }: { searchParams: { edit?: string } }) {
  const [rows, kategoriRows] = await Promise.all([
    q<Lov>(`SELECT * FROM sjp_lov ORDER BY tipe, kode`),
    q<{ nama: string }>(`SELECT nama FROM sjp_lov_kategori ORDER BY nama`),
  ]);
  const catatan = rows.filter((r) => r.tipe === "CATATAN");
  const oos = rows.filter((r) => r.tipe === "OOS");
  const editId = Number(searchParams.edit) || null;
  const edit = editId ? rows.find((r) => r.lov_id === editId) || null : null;

  return (
    <>
      <div className="mb-1 text-xl font-bold">LOV Catatan</div>
      <div className="text-sm text-mut mb-5">List of Value: catatan kunjungan &amp; alasan luar jadwal (OOS)</div>

      <div className="grid grid-cols-[1.7fr_1fr] gap-4 max-[900px]:grid-cols-1">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="font-bold mb-3">Catatan Kunjungan</div>
            <Table rows={catatan} editId={editId} />
          </div>
          <div className="card p-5">
            <div className="font-bold mb-3">Alasan Luar Jadwal (OOS)</div>
            <Table rows={oos} editId={editId} />
          </div>
        </div>

        <div className="space-y-4 self-start">
          <div className={`card p-5 ${edit ? "border-brand" : ""}`}>
            <div className="font-bold mb-3 flex items-center justify-between">
              {edit ? <>Edit LOV — {edit.kode}</> : "Tambah LOV"}
              {edit ? <Link href="/lov" className="btn btn-sm">Batal</Link> : null}
            </div>
            {/* key= memaksa form remount saat ganti target edit, agar defaultValue segar */}
            <form key={edit?.lov_id ?? "new"} action={addLov} className="space-y-3">
              <div><label className="lbl">Tipe</label>
                <select name="tipe" className="inp" defaultValue={edit?.tipe || "CATATAN"} disabled={!!edit}>
                  <option value="CATATAN">Catatan Kunjungan</option><option value="OOS">Alasan OOS</option>
                </select>
                {edit ? <input type="hidden" name="tipe" value={edit.tipe} /> : null}
              </div>
              <div><label className="lbl">Kode</label>
                <input name="kode" className={`inp ${edit ? "opacity-60" : ""}`} placeholder="LOV-10 / OOS-07"
                  defaultValue={edit?.kode || ""} readOnly={!!edit} />
              </div>
              <div><label className="lbl">Teks</label><input name="teks" className="inp" placeholder="mis. Reorder produk" defaultValue={edit?.teks || ""} /></div>
              <div><label className="lbl">Kategori</label>
                <select name="kategori" className="inp" defaultValue={edit?.kategori || ""}>
                  <option value="">— tanpa kategori —</option>
                  {kategoriRows.map((k) => <option key={k.nama} value={k.nama}>{k.nama}</option>)}
                </select>
                <p className="text-[11px] text-mut mt-1">Kategori <b>Order</b> memunculkan form input pembelian di app salesman.</p>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="perlu_followup" defaultChecked={!!edit?.perlu_followup} /> Perlu follow-up</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="perlu_approval" defaultChecked={!!edit?.perlu_approval} /> Perlu approval</label>
              <SubmitButton className="btn btn-pri w-full justify-center">{edit ? "Simpan Perubahan" : "Simpan LOV"}</SubmitButton>
              {!edit ? <p className="text-[11px] text-mut">Kode sama (tipe+kode) akan menimpa data lama.</p> : null}
            </form>
          </div>

          <div className="card p-5">
            <div className="font-bold mb-2">Master Kategori</div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {kategoriRows.map((k) => <span key={k.nama} className="pill p-mut">{k.nama}</span>)}
            </div>
            <form action={addKategori} className="flex gap-2">
              <input name="nama" className="inp !py-1.5 text-sm" placeholder="Kategori baru…" />
              <SubmitButton className="btn btn-sm whitespace-nowrap" pendingText="…">＋ Tambah</SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
