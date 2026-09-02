import { NextRequest, NextResponse } from "next/server";
import { q, q1 } from "@/lib/db";
import { getSession } from "@/lib/session";
import { haversineMeters, GEOFENCE_M } from "@/lib/geo";
import { getBoolSetting } from "@/lib/settings";
import { uploadPhoto } from "@/lib/storage";

export const dynamic = "force-dynamic";

function n(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function decodePhoto(dataUrl: string): Buffer | null {
  if (!dataUrl) return null;
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  try { return Buffer.from(b64, "base64"); } catch { return null; }
}
function wibYmd(iso: string): string {
  const t = Date.parse(iso);
  const base = Number.isFinite(t) ? t : Date.now();
  return new Date(base + 7 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
}
const err = (msg: string, code = 400) => NextResponse.json({ error: msg }, { status: code });

// Submit check-in kunjungan (online & replay antrean offline). Idempotent via client_uid.
export async function POST(req: NextRequest) {
  const s = await getSession();
  const emp = s?.emp_id;
  if (!emp) return err("Sesi tidak valid / bukan salesman.", 401);

  const b: any = await req.json().catch(() => ({}));
  const client_uid = String(b?.client_uid || "").trim() || null;
  const client_ts = String(b?.client_ts || new Date().toISOString());
  const sched_id = b?.sched_id ? Number(b.sched_id) : null;
  const is_oos = b?.is_oos === true || b?.is_oos === "1";
  // multi-reason: terima array; fallback ke nilai tunggal lama
  const toIds = (arr: any, single: any): number[] => {
    const src = Array.isArray(arr) ? arr : single != null && single !== "" ? [single] : [];
    return Array.from(new Set(src.map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x) && x > 0)));
  };
  const catatan_ids = toIds(b?.catatan_lov_ids, b?.catatan_lov_id);
  const oos_ids = toIds(b?.oos_lov_ids, b?.oos_lov_id);
  const catatan_lov_id = catatan_ids[0] ?? null; // legacy (elemen pertama)
  const oos_lov_id = oos_ids[0] ?? null;
  const free_text = String(b?.free_text || "").trim() || null;
  const ar_collect = ["FULL", "PARTIAL"].includes(String(b?.ar_collect)) ? String(b.ar_collect) : null;
  let ar_amount = n(b?.ar_amount);
  const lat = n(b?.lat), lng = n(b?.lng), accuracy = n(b?.accuracy);
  const photoBuf = decodePhoto(String(b?.photo || ""));
  let cust_code = String(b?.cust_code || "").trim() || null;
  let prospek_id: string | null = null;

  // validasi dasar
  const photoMandatory = await getBoolSetting("photo_mandatory", true);
  if (lat === null || lng === null) return err("Lokasi GPS belum terbaca.");
  if (photoMandatory && !photoBuf) return err("Foto selfie wajib.");
  if (catatan_ids.length === 0) return err("Pilih catatan kunjungan.");
  if (is_oos && oos_ids.length === 0) return err("Pilih alasan luar jadwal (OOS).");

  // Dedup: kalau client_uid ini sudah tercatat -> anggap sukses (replay), jangan dobel.
  if (client_uid) {
    const dup = await q1(`SELECT 1 FROM sjp_visit_log WHERE client_uid=$1`, [client_uid]);
    if (dup) return NextResponse.json({ ok: true, dedup: true });
  }

  // OOS prospek baru
  const newProspekName = String(b?.prospek_nama || "").trim();
  if (is_oos && !cust_code && newProspekName) {
    const seq = await q1<{ n: number }>(`SELECT count(*)+1 AS n FROM sjp_prospect`);
    prospek_id = `PROSPEK-${new Date().toISOString().slice(2, 7).replace("-", "")}-${String(seq?.n || 1).padStart(3, "0")}`;
    await q(
      `INSERT INTO sjp_prospect (prospek_id, nama_usaha, alamat, pic, hp, lat, lng, emp_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'BELUM')`,
      [prospek_id, newProspekName, String(b?.prospek_alamat || "").trim() || null,
       String(b?.prospek_pic || "").trim() || null, String(b?.prospek_hp || "").trim() || null, lat, lng, emp]);
  }
  if (!cust_code && !prospek_id) return err("Customer belum dipilih.");

  // Penagihan AR: FULL → pakai outstanding master bila nominal tak dikirim; PARTIAL → wajib nominal > 0.
  if (ar_collect === "PARTIAL" && !(ar_amount && ar_amount > 0)) return err("Isi nominal pembayaran sebagian.");
  if (ar_collect === "FULL" && (ar_amount == null || ar_amount <= 0) && cust_code) {
    const arRow = await q1<{ ar_outstanding: number }>(`SELECT ar_outstanding FROM sjp_customer_ar WHERE cust_code=$1`, [cust_code]);
    ar_amount = arRow?.ar_outstanding != null ? Number(arRow.ar_outstanding) : null;
  }
  if (!ar_collect) ar_amount = null;

  // Geofence NON-BLOCKING (+ patokan first-checkin)
  let gps_distance: number | null = null;
  let gps_valid = true;
  let geoProposal: { old_lat: number; old_lng: number } | null = null;
  if (cust_code) {
    const geo = await q1<{ lat: number; lng: number }>(`SELECT lat, lng FROM sjp_customer_geo WHERE cust_code=$1`, [cust_code]);
    if (geo && geo.lat != null && geo.lng != null) {
      gps_distance = haversineMeters(lat, lng, Number(geo.lat), Number(geo.lng));
      gps_valid = gps_distance <= GEOFENCE_M;
      if (!gps_valid) geoProposal = { old_lat: Number(geo.lat), old_lng: Number(geo.lng) };
    } else {
      await q(
        `INSERT INTO sjp_customer_geo (cust_code, lat, lng, source) VALUES ($1,$2,$3,'first_checkin')
         ON CONFLICT (cust_code) DO UPDATE SET lat=EXCLUDED.lat, lng=EXCLUDED.lng, source='first_checkin', updated_at=now()`,
        [cust_code, lat, lng]);
      gps_valid = true; gps_distance = 0;
    }
  }

  const effRow = await q1<{ n: number }>(
    `SELECT count(*) n FROM sjp_lov WHERE lov_id = ANY($1) AND kode='LOV-02'`, [catatan_ids]);
  const effective = Number(effRow?.n || 0) > 0;

  const ins = await q1<{ visit_id: number }>(
    `INSERT INTO sjp_visit_log
       (tgl, emp_id, cust_code, prospek_id, sched_id, is_oos, oos_lov_id, oos_lov_ids, checkin_dt,
        lat, lng, gps_accuracy, gps_distance_m, gps_valid, catatan_lov_id, catatan_lov_ids, free_text, is_effective_call, client_uid,
        ar_collect, ar_amount)
     VALUES (($1::timestamptz AT TIME ZONE 'Asia/Jakarta')::date, $2,$3,$4,$5,$6,$7,$8, $1::timestamptz,
             $9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     ON CONFLICT (client_uid) WHERE client_uid IS NOT NULL DO NOTHING
     RETURNING visit_id`,
    [client_ts, emp, cust_code, prospek_id, sched_id, is_oos, oos_lov_id, oos_ids.length ? oos_ids : null,
     lat, lng, accuracy, gps_distance, gps_valid, catatan_lov_id, catatan_ids, free_text, effective, client_uid,
     ar_collect, ar_amount]);

  // konflik client_uid (sudah masuk barusan) -> anggap sukses, lewati side-effect
  if (!ins?.visit_id) return NextResponse.json({ ok: true, dedup: true });
  const visit_id = ins.visit_id;

  if (photoBuf) {
    const path = await uploadPhoto(`visits/${emp}/${wibYmd(client_ts)}/${visit_id}.jpg`, photoBuf);
    if (path) await q(`UPDATE sjp_visit_log SET photo_path=$2 WHERE visit_id=$1`, [visit_id, path]);
    else await q(`UPDATE sjp_visit_log SET photo=$2 WHERE visit_id=$1`, [visit_id, photoBuf]);
  }

  if (geoProposal && cust_code) {
    await q(
      `INSERT INTO sjp_geo_approval (cust_code, emp_id, visit_id, old_lat, old_lng, new_lat, new_lng, distance_m, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING')
       ON CONFLICT (cust_code) WHERE status='PENDING'
       DO UPDATE SET emp_id=EXCLUDED.emp_id, visit_id=EXCLUDED.visit_id, old_lat=EXCLUDED.old_lat,
         old_lng=EXCLUDED.old_lng, new_lat=EXCLUDED.new_lat, new_lng=EXCLUDED.new_lng,
         distance_m=EXCLUDED.distance_m, created_at=now()`,
      [cust_code, emp, visit_id, geoProposal.old_lat, geoProposal.old_lng, lat, lng, gps_distance]);
  }

  if (sched_id) await q(`UPDATE sjp_schedule SET status='DONE' WHERE sched_id=$1`, [sched_id]);

  return NextResponse.json({ ok: true });
}
