/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { q, q1 } from "@/lib/db";
import MapClient from "@/app/hos/peta/MapClient";
import GmapIcon from "@/components/GmapIcon";

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
    `SELECT att_id, mode, to_char(checkin_dt AT TIME ZONE 'Asia/Jakarta','DD Mon YYYY HH24:MI') waktu,
            lat, lng, gps_accuracy, photo_path
       FROM sjp_attendance WHERE emp_id=$1 AND tgl=$2`, [emp, d]);
  const masuk = rows.find((r) => r.mode === "MASUK");
  const pulang = rows.find((r) => r.mode === "PULANG");

  const masukUrl = masuk?.photo_path ? `/api/attendance-photo/${masuk.att_id}` : null;
  const pulangUrl = pulang?.photo_path ? `/api/attendance-photo/${pulang.att_id}` : null;

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
          <div className="flex gap-4 flex-col sm:flex-row">
            {url ? (
              <img src={url} alt="selfie" className="w-full sm:w-72 h-auto max-h-[28rem] object-contain rounded-xl bg-[#e5e7eb] flex-shrink-0" />
            ) : (
              <div className="w-full sm:w-72 h-64 rounded-xl bg-[#e5e7eb] grid place-items-center text-5xl text-[#9ca3af] flex-shrink-0">📷</div>
            )}
            <div className="text-sm space-y-1">
              <div><span className="text-mut">Waktu:</span> <b>{row.waktu}</b></div>
              <div><span className="text-mut">Koordinat:</span> {row.lat != null ? `${Number(row.lat).toFixed(5)}, ${Number(row.lng).toFixed(5)}` : "—"}</div>
              <div><span className="text-mut">Akurasi:</span> {row.gps_accuracy ? `±${Math.round(row.gps_accuracy)} m` : "—"}</div>
              {row.lat != null ? (
                <a href={`https://www.google.com/maps?q=${row.lat},${row.lng}`} target="_blank" rel="noreferrer"
                  className="btn btn-sm inline-flex items-center gap-1.5 mt-1"><GmapIcon size={16} /> Google Maps</a>
              ) : null}
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
          <MapClient points={points} height={560} />
        </div>
      ) : null}
    </div>
  );
}
