import Link from "next/link";
import { q } from "@/lib/db";
import { linkProspek, arsipProspek, unarsipProspek } from "./actions";
import SubmitButton from "@/components/SubmitButton";
import GmapIcon from "@/components/GmapIcon";

export const dynamic = "force-dynamic";

const ST_TABS = [
  { key: "aktif", label: "Aktif" },
  { key: "arsip", label: "Arsip" },
  { key: "semua", label: "Semua" },
] as const;

export default async function ProspekPage({ searchParams }: { searchParams: { st?: string } }) {
  const st = ST_TABS.some((t) => t.key === searchParams.st) ? searchParams.st! : "aktif";

  // first_visit_id = kunjungan OOS yang MEMBUAT prospek (paling awal) -> sumber foto & bukti
  const rows = await q<any>(`
    SELECT p.*, e.emp_name, fv.visit_id first_visit_id,
           count(*) FILTER (WHERE p.status <> 'ARSIP') OVER () n_aktif,
           count(*) FILTER (WHERE p.status = 'ARSIP') OVER () n_arsip
    FROM sjp_prospect p
    LEFT JOIN sjp_employee e ON e.emp_id = p.emp_id
    LEFT JOIN LATERAL (
      SELECT v.visit_id FROM sjp_visit_log v
      WHERE v.prospek_id = p.prospek_id ORDER BY v.checkin_dt LIMIT 1) fv ON true
    ORDER BY p.created_at DESC`);
  const nAktif = Number(rows[0]?.n_aktif || 0), nArsip = Number(rows[0]?.n_arsip || 0);
  const shown = rows.filter((r) => (st === "semua" ? true : st === "arsip" ? r.status === "ARSIP" : r.status !== "ARSIP"));

  return (
    <>
      <div className="mb-1 text-xl font-bold">Prospek — Data Lokal SJP</div>
      <div className="text-sm text-mut mb-5">Customer baru hasil kunjungan OOS. Bukan master customer (master di core system).</div>

      <div className="card p-5 border-l-4 border-info">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex gap-2 text-sm">
            {ST_TABS.map((t) => (
              <Link key={t.key} href={`/prospek?st=${t.key}`} className={`btn btn-sm ${st === t.key ? "btn-pri" : ""}`}>
                {t.label} ({t.key === "aktif" ? nAktif : t.key === "arsip" ? nArsip : nAktif + nArsip})
              </Link>
            ))}
          </div>
          {/* export SEMUA status (aktif + arsip) */}
          <a href="/api/prospek/xlsx" className="btn btn-sm" download>⬇ Export Excel</a>
        </div>

        {shown.length === 0 ? (
          <div className="text-sm text-mut">
            {st === "arsip" ? "Tidak ada prospek yang diarsipkan." : 'Belum ada prospek. Prospek muncul saat salesman check-in OOS "Prospek/customer baru".'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr>
                <th className="th">ID Prospek</th><th className="th">Nama Usaha</th><th className="th">Alamat</th>
                <th className="th">PIC/HP</th><th className="th">Salesman</th><th className="th">Foto</th>
                <th className="th">Lokasi</th><th className="th">Status</th><th className="th">Aksi</th>
              </tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.prospek_id} className={`hover:bg-[#fafafa] ${r.status === "ARSIP" ? "opacity-60" : ""}`}>
                    <td className="td font-mono text-xs">{r.prospek_id}</td>
                    <td className="td font-semibold">{r.nama_usaha}</td>
                    <td className="td text-xs">{r.alamat || "—"}</td>
                    <td className="td text-xs">{[r.pic, r.hp].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="td">{r.emp_name || r.emp_id || "—"}</td>
                    <td className="td">
                      {r.first_visit_id ? (
                        <a href={`/api/photo/${r.first_visit_id}`} target="_blank" rel="noreferrer" title="Lihat foto penuh">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/photo/${r.first_visit_id}`} alt="" className="w-12 h-12 object-cover rounded-lg border border-line" />
                        </a>
                      ) : "—"}
                    </td>
                    <td className="td whitespace-nowrap">
                      {r.lat != null && r.lng != null ? (
                        <a href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-brand underline text-xs">
                          <GmapIcon size={15} /> Peta
                        </a>
                      ) : "—"}
                    </td>
                    <td className="td">
                      <span className={`pill ${r.status === "TAUTKAN" ? "p-ok" : r.status === "ARSIP" ? "p-mut" : "p-warn"}`}>
                        {r.status === "TAUTKAN" ? `→ ${r.linked_cust_code}` : r.status === "ARSIP" ? "Arsip" : "Belum jadi customer"}
                      </span>
                    </td>
                    <td className="td whitespace-nowrap">
                      {r.status === "ARSIP" ? (
                        <form action={unarsipProspek} className="inline">
                          <input type="hidden" name="prospek_id" value={r.prospek_id} />
                          <SubmitButton className="btn btn-sm" pendingText="…">↩ Aktifkan</SubmitButton>
                        </form>
                      ) : (
                        <>
                          <form action={linkProspek} className="inline-flex gap-1 items-center">
                            <input type="hidden" name="prospek_id" value={r.prospek_id} />
                            <input name="cust_code" className="inp !w-28 !py-1" placeholder="Cust_Code" />
                            <SubmitButton className="btn btn-sm" pendingText="…">🔗 Tautkan</SubmitButton>
                          </form>
                          <form action={arsipProspek} className="inline ml-1">
                            <input type="hidden" name="prospek_id" value={r.prospek_id} />
                            <SubmitButton className="btn btn-sm" pendingText="…">Arsip</SubmitButton>
                          </form>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="card p-4 mt-4 bg-[#e8f0fe] border-[#c7dbfc]">
        <div className="text-sm text-[#1e40af]">ℹ️ Master customer di-input di <b>core system MPS</b> (read-only). SJP tidak membuat customer — prospek cukup ditautkan bila core sudah membuatnya. Foto diambil dari check-in OOS yang membuat prospek.</div>
      </div>
    </>
  );
}
