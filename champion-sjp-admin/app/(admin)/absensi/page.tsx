/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { q } from "@/lib/db";
import { signedUrls } from "@/lib/storage";
import PurgeButton from "./PurgeButton";
import GmapIcon from "@/components/GmapIcon";

export const dynamic = "force-dynamic";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function ymdToday() {
  const d = new Date(Date.now() + 7 * 3600 * 1000); // WIB
  return d.toISOString().slice(0, 10);
}

export default async function AbsensiPage({ searchParams }: { searchParams: { d?: string } }) {
  const d = searchParams.d || ymdToday();
  const dt = new Date(d + "T00:00:00");
  const label = `${HARI[dt.getDay()]}, ${dt.getDate()} ${BULAN[dt.getMonth()]} ${dt.getFullYear()}`;

  const rows = await q<any>(
    `SELECT a.emp_id, e.emp_name, a.mode,
            to_char(a.checkin_dt AT TIME ZONE 'Asia/Jakarta','HH24:MI') jam,
            a.lat, a.lng, a.photo_path
       FROM sjp_attendance a
       LEFT JOIN sjp_employee e ON e.emp_id = a.emp_id
      WHERE a.tgl = $1
      ORDER BY e.emp_name, a.mode`, [d]);

  // pivot per salesman
  const map = new Map<string, any>();
  for (const r of rows) {
    const g = map.get(r.emp_id) || { emp_id: r.emp_id, emp_name: r.emp_name };
    g[r.mode === "MASUK" ? "masuk" : "pulang"] = r;
    map.set(r.emp_id, g);
  }
  const list = Array.from(map.values());

  // signed URL thumbnail foto masuk (batch)
  const masukPaths = list.map((g) => g.masuk?.photo_path).filter(Boolean);
  const urls = await signedUrls(masukPaths, 3600);

  const dayLink = (delta: number) => {
    const x = new Date(dt); x.setDate(dt.getDate() + delta);
    return `/absensi?d=${x.toISOString().slice(0, 10)}`;
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
        <div className="text-xl font-bold">Absensi Salesman</div>
        <PurgeButton />
      </div>
      <div className="text-sm text-mut mb-4">Absen masuk & pulang salesman (selfie + lokasi). Klik baris untuk foto & peta.</div>

      {/* date picker */}
      <div className="flex items-center gap-2 mb-4">
        <Link href={dayLink(-1)} className="btn btn-sm">‹</Link>
        <form><input type="date" name="d" defaultValue={d} className="inp !w-44 !py-1.5 text-sm" /></form>
        <Link href={dayLink(1)} className="btn btn-sm">›</Link>
        <Link href="/absensi" className="btn btn-sm">Hari ini</Link>
        <span className="text-xs text-mut ml-1">📆 {label}</span>
      </div>

      <div className="card p-5 overflow-x-auto">
        {list.length === 0 ? (
          <div className="text-sm text-mut">Belum ada absensi untuk tanggal ini.</div>
        ) : (
          <table className="w-full border-collapse">
            <thead><tr>
              <th className="th">Foto</th><th className="th">Salesman</th><th className="th">Masuk</th>
              <th className="th">Pulang</th><th className="th">Lokasi masuk</th><th className="th"></th>
            </tr></thead>
            <tbody>
              {list.map((g) => (
                <tr key={g.emp_id} className="hover:bg-[#fafafa]">
                  <td className="td">
                    {g.masuk?.photo_path && urls[g.masuk.photo_path] ? (
                      <img src={urls[g.masuk.photo_path]} alt="" loading="lazy" className="w-10 h-10 object-cover rounded-lg border border-line" />
                    ) : <span className="text-mut text-xs">—</span>}
                  </td>
                  <td className="td font-semibold">{g.emp_name || g.emp_id}</td>
                  <td className="td">{g.masuk ? <span className="pill p-ok">{g.masuk.jam}</span> : <span className="pill p-mut">—</span>}</td>
                  <td className="td">{g.pulang ? <span className="pill p-ok">{g.pulang.jam}</span> : <span className="pill p-warn">belum</span>}</td>
                  <td className="td text-xs">
                    {g.masuk?.lat != null ? (
                      <a href={`https://www.google.com/maps?q=${g.masuk.lat},${g.masuk.lng}`}
                        target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand underline">
                        <GmapIcon size={15} /> Peta</a>
                    ) : "—"}
                  </td>
                  <td className="td"><Link href={`/absensi/${g.emp_id}?d=${d}`} className="btn btn-sm">Detail</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
