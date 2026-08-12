import { q, q1 } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getBoolSetting } from "@/lib/settings";
import AbsenForm from "./AbsenForm";

export const dynamic = "force-dynamic";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default async function AbsenPage() {
  const user = await getSession();
  const emp = user?.emp_id || "";
  const now = new Date();
  const tgl = `${HARI[now.getDay()]}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;

  if (!emp) {
    return <div className="p-4"><div className="card p-4 text-sm text-mut">Akun ini belum ditautkan ke salesman. Hubungi Admin.</div></div>;
  }

  const rows = await q<any>(
    `SELECT mode, to_char(checkin_dt AT TIME ZONE 'Asia/Jakarta','HH24:MI') jam
       FROM sjp_attendance WHERE emp_id=$1 AND tgl=(now() AT TIME ZONE 'Asia/Jakarta')::date`, [emp]);
  const masuk = rows.find((r) => r.mode === "MASUK");
  const pulang = rows.find((r) => r.mode === "PULANG");
  const photoMandatory = await getBoolSetting("attendance_photo_mandatory", true);

  return (
    <div className="p-4 space-y-3">
      <div className="card p-4">
        <div className="text-lg font-extrabold">Absensi</div>
        <div className="text-xs text-mut">{tgl}</div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1 bg-[#eef0f3] rounded-lg p-3 text-center">
            <div className="text-[11px] text-mut">Masuk</div>
            <div className={`text-xl font-extrabold ${masuk ? "text-ok" : "text-mut"}`}>{masuk?.jam || "—"}</div>
          </div>
          <div className="flex-1 bg-[#eef0f3] rounded-lg p-3 text-center">
            <div className="text-[11px] text-mut">Pulang</div>
            <div className={`text-xl font-extrabold ${pulang ? "text-ok" : "text-mut"}`}>{pulang?.jam || "—"}</div>
          </div>
        </div>
      </div>

      {!masuk ? (
        <div className="card p-4">
          <div className="font-bold mb-2">Absen Masuk</div>
          <AbsenForm mode="MASUK" photoMandatory={photoMandatory} />
        </div>
      ) : !pulang ? (
        <div className="card p-4">
          <div className="font-bold mb-2">Absen Pulang</div>
          <div className="text-[11px] text-mut mb-2">Masuk tercatat pukul {masuk.jam}. Absen pulang saat selesai kerja.</div>
          <AbsenForm mode="PULANG" photoMandatory={photoMandatory} />
        </div>
      ) : (
        <div className="card p-4 text-center">
          <div className="text-3xl">✅</div>
          <div className="font-bold mt-1">Absensi hari ini lengkap</div>
          <div className="text-xs text-mut">Masuk {masuk.jam} · Pulang {pulang.jam}</div>
        </div>
      )}
    </div>
  );
}
