import { NextRequest, NextResponse } from "next/server";
import { q, q1 } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getBoolSetting } from "@/lib/settings";
import { uploadPhoto } from "@/lib/storage";

export const dynamic = "force-dynamic";

function decodePhoto(dataUrl: string): Buffer | null {
  if (!dataUrl) return null;
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  try { return Buffer.from(b64, "base64"); } catch { return null; }
}
// YYYYMMDD (WIB) dari ISO timestamp
function wibYmd(iso: string): string {
  const t = Date.parse(iso);
  const base = Number.isFinite(t) ? t : Date.now();
  return new Date(base + 7 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}

// Submit absen (online maupun replay dari antrean offline). Idempotent via ON CONFLICT.
export async function POST(req: NextRequest) {
  const s = await getSession();
  const emp = s?.emp_id;
  if (!emp) return NextResponse.json({ error: "Sesi tidak valid / bukan salesman." }, { status: 401 });

  const body: any = await req.json().catch(() => ({}));
  const mode = String(body?.mode || "");
  if (mode !== "MASUK" && mode !== "PULANG") return NextResponse.json({ error: "Mode absen tidak valid." }, { status: 400 });

  const lat = Number(body?.lat), lng = Number(body?.lng);
  const accuracy = body?.accuracy != null && body?.accuracy !== "" ? Number(body.accuracy) : null;
  const client_ts = String(body?.client_ts || new Date().toISOString());
  const photoBuf = decodePhoto(String(body?.photo || ""));
  const photoMandatory = await getBoolSetting("attendance_photo_mandatory", true);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: "Lokasi GPS tidak ada." }, { status: 400 });
  if (photoMandatory && !photoBuf) return NextResponse.json({ error: "Foto selfie wajib." }, { status: 400 });

  if (mode === "PULANG") {
    const masuk = await q1(
      `SELECT 1 FROM sjp_attendance
        WHERE emp_id=$1 AND tgl=($2::timestamptz AT TIME ZONE 'Asia/Jakarta')::date AND mode='MASUK'`,
      [emp, client_ts]);
    if (!masuk) return NextResponse.json({ error: "Absen masuk dulu sebelum absen pulang." }, { status: 400 });
  }

  let photo_path: string | null = null;
  if (photoBuf) {
    photo_path = await uploadPhoto(`attendance/${emp}/${wibYmd(client_ts)}/${mode}.jpg`, photoBuf);
    if (photoMandatory && !photo_path) return NextResponse.json({ error: "Gagal mengunggah foto. Coba lagi." }, { status: 502 });
  }

  await q(
    `INSERT INTO sjp_attendance (tgl, emp_id, mode, checkin_dt, lat, lng, gps_accuracy, photo_path)
     VALUES (($1::timestamptz AT TIME ZONE 'Asia/Jakarta')::date, $2, $3, $1::timestamptz, $4, $5, $6, $7)
     ON CONFLICT (tgl, emp_id, mode)
     DO UPDATE SET checkin_dt=EXCLUDED.checkin_dt, lat=EXCLUDED.lat, lng=EXCLUDED.lng,
                   gps_accuracy=EXCLUDED.gps_accuracy,
                   photo_path=COALESCE(EXCLUDED.photo_path, sjp_attendance.photo_path)`,
    [client_ts, emp, mode, lat, lng, accuracy, photo_path]);

  return NextResponse.json({ ok: true });
}
