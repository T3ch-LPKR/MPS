import Link from "next/link";
import { q, q1 } from "@/lib/db";
import { approveGeo, rejectGeo, approveAllGeo } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

const PAGE = 10;

export default async function ApprovalGpsPage({
  searchParams,
}: {
  searchParams: { femp?: string; ap?: string };
}) {
  const emp = searchParams.femp || "";
  const salesmen = await q<any>(`SELECT emp_id, emp_name FROM sjp_employee WHERE is_salesman ORDER BY emp_name`);

  const totalRow = await q1<any>(
    `SELECT count(*) n FROM sjp_geo_approval WHERE status='PENDING' AND ($1='' OR emp_id=$1)`, [emp]);
  const total = Number(totalRow?.n || 0);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.min(Math.max(1, Number(searchParams.ap || 1) || 1), pages);
  const offset = (page - 1) * PAGE;

  const rows = await q<any>(
    `SELECT a.geo_appr_id, a.cust_code, a.emp_id, a.visit_id,
            a.old_lat, a.old_lng, a.new_lat, a.new_lng, a.distance_m, a.created_at,
            c.cust_name, e.emp_name
       FROM sjp_geo_approval a
       LEFT JOIN sjp_customer c ON c.cust_code = a.cust_code
       LEFT JOIN sjp_employee e ON e.emp_id = a.emp_id
      WHERE a.status='PENDING' AND ($1='' OR a.emp_id=$1)
      ORDER BY a.created_at DESC
      LIMIT ${PAGE} OFFSET ${offset}`, [emp]);

  const pageLink = (p: number) => {
    const u = new URLSearchParams();
    if (emp) u.set("femp", emp);
    u.set("ap", String(p));
    return `/approval-gps?${u.toString()}`;
  };
  const osm = (lat: number, lng: number) =>
    `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
  const fmtTime = (t: string) =>
    new Date(t).toLocaleString("id", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <div className="mb-1 text-xl font-bold">Approval GPS</div>
      <div className="text-sm text-mut mb-5">
        Usulan titik lokasi baru dari salesman yang check-in di luar radius 50 m. Approve → titik master
        di-update. Tolak → kunjungan dianggap luar jadwal (OOS).
      </div>

      {/* filter + approve all */}
      <div className="card p-4 mb-4 flex flex-wrap gap-2 items-end justify-between">
        <form className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="lbl">Salesman</label>
            <select name="femp" defaultValue={emp} className="inp !w-52">
              <option value="">Semua</option>
              {salesmen.map((s: any) => (
                <option key={s.emp_id} value={s.emp_id}>{s.emp_name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-sm">Terapkan</button>
          <Link href="/approval-gps" className="btn btn-sm">Reset</Link>
        </form>

        {total > 0 ? (
          <form action={approveAllGeo}>
            <input type="hidden" name="femp" value={emp} />
            <SubmitButton className="btn btn-pri btn-sm" pendingText="Memproses…">
              ✔ Approve Semua ({total})
            </SubmitButton>
          </form>
        ) : null}
      </div>

      <div className="card p-5">
        {rows.length === 0 ? (
          <div className="text-sm text-mut">Tidak ada usulan GPS menunggu persetujuan.</div>
        ) : (
          <table className="w-full border-collapse">
            <thead><tr>
              <th className="th">Salesman</th><th className="th">Customer</th><th className="th">Jarak</th>
              <th className="th">Waktu</th><th className="th">Bukti</th><th className="th">Peta</th><th className="th">Aksi</th>
            </tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.geo_appr_id} className="hover:bg-[#fafafa]">
                  <td className="td">{r.emp_name || r.emp_id}</td>
                  <td className="td">
                    <div className="font-semibold">{r.cust_name || "—"}</div>
                    <div className="font-mono text-[11px] text-mut">{r.cust_code}</div>
                  </td>
                  <td className="td">
                    <span className="pill p-warn">{Math.round(Number(r.distance_m || 0))} m</span>
                  </td>
                  <td className="td text-xs">{fmtTime(r.created_at)}</td>
                  <td className="td">
                    {r.visit_id ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/photo/${r.visit_id}`} alt="bukti" className="w-12 h-12 object-cover rounded-lg border border-line" />
                    ) : <span className="text-mut text-xs">—</span>}
                  </td>
                  <td className="td text-xs whitespace-nowrap">
                    <a href={osm(r.new_lat, r.new_lng)} target="_blank" rel="noreferrer" className="text-brand underline">Titik baru</a>
                    {r.old_lat != null ? (
                      <> · <a href={osm(r.old_lat, r.old_lng)} target="_blank" rel="noreferrer" className="text-mut underline">lama</a></>
                    ) : null}
                  </td>
                  <td className="td whitespace-nowrap">
                    <form action={approveGeo} className="inline">
                      <input type="hidden" name="geo_appr_id" value={r.geo_appr_id} />
                      <SubmitButton className="btn btn-pri btn-sm" pendingText="…">✔ Approve</SubmitButton>
                    </form>
                    <form action={rejectGeo} className="inline ml-1">
                      <input type="hidden" name="geo_appr_id" value={r.geo_appr_id} />
                      <SubmitButton className="btn btn-sm" pendingText="…">✖ Tolak</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pages > 1 ? (
          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="text-mut">Menampilkan {offset + 1}–{Math.min(offset + PAGE, total)} dari {total}</div>
            <div className="flex gap-1">
              {page > 1 ? <Link href={pageLink(page - 1)} className="btn btn-sm">‹ Prev</Link>
                : <span className="btn btn-sm opacity-40 pointer-events-none">‹ Prev</span>}
              {page < pages ? <Link href={pageLink(page + 1)} className="btn btn-sm">Next ›</Link>
                : <span className="btn btn-sm opacity-40 pointer-events-none">Next ›</span>}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
