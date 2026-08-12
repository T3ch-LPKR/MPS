/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { q, q1 } from "@/lib/db";
import { signedUrl } from "@/lib/storage";
import MapClient from "@/app/hos/peta/MapClient";

export const dynamic = "force-dynamic";

function ymdToday() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export default async function AbsensiDetail({
  params, searchParams,
}: { params: { emp: string }; searchParams: { d?: string } }) {
  const emp = params.emp;
  const d = searchParams.d || ymdToday();

  const empRow = await q1<any>(`SELECT emp_name FROM sjp_employee WHERE emp_id=$1`, [emp]);
  const rows = await q<any>(
    `SELECT mode, to_char(checkin_dt AT TIME ZONE 'Asia/Jakarta','DD Mon YYYY HH24:MI') waktu,
            lat, lng, gps_accuracy, photo_path
       FROM sjp_attendance WHERE emp_id=$1 AND tgl=$2`, [emp, d]);
  const masuk = rows.find((r) => r.mode === "MASUK");
  const pulang = rows.find((r) => r.mode === "PULANG");

  const [masukUrl, pulangUrl] = await Promise.all([
    signedUrl(masuk?.photo_path || null),
    signedUrl(pulang?.photo_path || null),
  ]);

  const points: any[] = [];
  if (masuk?.lat != null) points.push({ lat: Number(masuk.lat), lng: Number(masuk.lng), label: "Masuk", type: "done" });
  if (pulang?.lat != null) points.push({ lat: Number(pulang.lat), lng: Number(pulang.lng), label: "Pulang", type: "plan" });

  function Card({ title, row, url }: { title: string; row: any; url: string | null }) {
    return (
      <div className="card p-4">
        <div className="font-bold mb-2">{title}</div>
        {!row ? (
          <div className="text-sm text-mut">Belum absen.</div>
        ) : (
          <div className="flex gap-3">
            <div className="w-28 h-28 rounded-xl overflow-hidden bg-[#e5e7eb] grid place-items-center flex-shrink-0">
              {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl text-[#9ca3af]">📷</span>}
            </div>
            <div className="text-sm space-y-1">
              <div><span className="text-mut">Waktu:</span> <b>{row.waktu}</b></div>
              <div><span className="text-mut">Koordinat:</span> {row.lat != null ? `${Number(row.lat).toFixed(5)}, ${Number(row.lng).toFixed(5)}` : "—"}</div>
              <div><span className="text-mut">Akurasi:</span> {row.gps_accuracy ? `±${Math.round(row.gps_accuracy)} m` : "—"}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Link href={`/absensi?d=${d}`} className="text-brand text-sm">‹ Kembali ke Absensi</Link>
      <div className="text-xl font-bold">{empRow?.emp_name || emp}</div>
      <div className="text-sm text-mut -mt-2">Tanggal {d}</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="Absen Masuk" row={masuk} url={masukUrl} />
        <Card title="Absen Pulang" row={pulang} url={pulangUrl} />
      </div>

      {points.length ? (
        <div className="card p-4">
          <div className="font-bold mb-2">Peta Lokasi</div>
          <MapClient points={points} />
        </div>
      ) : null}
    </div>
  );
}
