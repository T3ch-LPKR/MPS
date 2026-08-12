"use server";

import { redirect } from "next/navigation";
import { q, q1 } from "@/lib/db";
import { getSession } from "@/lib/session";
import { haversineMeters, GEOFENCE_M } from "@/lib/geo";
import { getBoolSetting } from "@/lib/settings";
import { uploadPhoto } from "@/lib/storage";

function num(v: FormDataEntryValue | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function decodePhoto(dataUrl: string): Buffer | null {
  if (!dataUrl) return null;
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  try { return Buffer.from(b64, "base64"); } catch { return null; }
}

/**
 * Submit check-in (kunjungan terjadwal maupun OOS).
 * - Customer tanpa geo: check-in pertama jadi PATOKAN (disimpan ke sjp_customer_geo).
 * - Customer punya geo: radius 50 m NON-BLOCKING. Di luar radius tetap tercatat
 *   (gps_valid=false) + usulan GPS baru masuk antrean approval admin (sjp_geo_approval).
 */
export async function submitCheckin(_prev: any, formData: FormData) {
  const s = await getSession();
  const emp = s?.emp_id;
  if (!emp) return { error: "Akun tidak tertaut salesman." };

  const sched_id = formData.get("sched_id") ? Number(formData.get("sched_id")) : null;
  const is_oos = formData.get("is_oos") === "1";
  const oos_lov_id = formData.get("oos_lov_id") ? Number(formData.get("oos_lov_id")) : null;
  const catatan_lov_id = formData.get("catatan_lov_id") ? Number(formData.get("catatan_lov_id")) : null;
  const free_text = String(formData.get("free_text") || "").trim() || null;
  const lat = num(formData.get("lat"));
  const lng = num(formData.get("lng"));
  const accuracy = num(formData.get("accuracy"));
  const photoBuf = decodePhoto(String(formData.get("photo") || ""));

  let cust_code = String(formData.get("cust_code") || "").trim() || null;
  let prospek_id: string | null = null;

  // validasi dasar
  const photoMandatory = await getBoolSetting("photo_mandatory", true);
  if (lat === null || lng === null) return { error: "Lokasi GPS belum terbaca. Aktifkan izin lokasi." };
  if (photoMandatory && !photoBuf) return { error: "Foto selfie wajib (diatur Admin)." };
  if (!catatan_lov_id) return { error: "Pilih catatan kunjungan." };
  if (is_oos && !oos_lov_id) return { error: "Pilih alasan luar jadwal (OOS)." };

  // OOS prospek baru (belum ada di master)
  const newProspekName = String(formData.get("prospek_nama") || "").trim();
  if (is_oos && !cust_code && newProspekName) {
    const seq = await q1<{ n: number }>(`SELECT count(*)+1 AS n FROM sjp_prospect`);
    prospek_id = `PROSPEK-${new Date().toISOString().slice(2, 7).replace("-", "")}-${String(seq?.n || 1).padStart(3, "0")}`;
    await q(
      `INSERT INTO sjp_prospect (prospek_id, nama_usaha, alamat, pic, hp, lat, lng, emp_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'BELUM')`,
      [prospek_id, newProspekName, String(formData.get("prospek_alamat") || "").trim() || null,
       String(formData.get("prospek_pic") || "").trim() || null, String(formData.get("prospek_hp") || "").trim() || null,
       lat, lng, emp]
    );
  }

  if (!cust_code && !prospek_id) return { error: "Customer belum dipilih." };

  // Geofence utk customer terdaftar (NON-BLOCKING).
  // >50 m TIDAK memblok: kunjungan tetap tercatat, GPS baru diusulkan ke admin (approval).
  let gps_distance: number | null = null;
  let gps_valid = true;
  let geoProposal: { old_lat: number; old_lng: number } | null = null;
  if (cust_code) {
    const geo = await q1<{ lat: number; lng: number }>(
      `SELECT lat, lng FROM sjp_customer_geo WHERE cust_code=$1`, [cust_code]);
    if (geo && geo.lat != null && geo.lng != null) {
      gps_distance = haversineMeters(lat, lng, Number(geo.lat), Number(geo.lng));
      gps_valid = gps_distance <= GEOFENCE_M;
      // di luar radius -> siapkan usulan GPS baru (bukan blok)
      if (!gps_valid) geoProposal = { old_lat: Number(geo.lat), old_lng: Number(geo.lng) };
    } else {
      // PATOKAN: check-in pertama -> simpan titik ini sebagai lokasi customer
      await q(
        `INSERT INTO sjp_customer_geo (cust_code, lat, lng, source)
         VALUES ($1,$2,$3,'first_checkin')
         ON CONFLICT (cust_code) DO UPDATE SET lat=EXCLUDED.lat, lng=EXCLUDED.lng, source='first_checkin', updated_at=now()`,
        [cust_code, lat, lng]);
      gps_valid = true; gps_distance = 0;
    }
  }

  // effective call = catatan Reorder (LOV-02)
  const lov = await q1<{ kode: string }>(`SELECT kode FROM sjp_lov WHERE lov_id=$1`, [catatan_lov_id]);
  const effective = lov?.kode === "LOV-02";

  const ins = await q1<{ visit_id: number }>(
    `INSERT INTO sjp_visit_log
       (tgl, emp_id, cust_code, prospek_id, sched_id, is_oos, oos_lov_id, checkin_dt,
        lat, lng, gps_accuracy, gps_distance_m, gps_valid, catatan_lov_id, free_text, is_effective_call)
     VALUES (CURRENT_DATE,$1,$2,$3,$4,$5,$6, now(), $7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING visit_id`,
    [emp, cust_code, prospek_id, sched_id, is_oos, oos_lov_id,
     lat, lng, accuracy, gps_distance, gps_valid, catatan_lov_id, free_text, effective]
  );
  const visit_id = ins?.visit_id;

  // Foto kunjungan -> Supabase Storage (fallback bytea bila upload gagal).
  if (visit_id && photoBuf) {
    const wib = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
    const path = await uploadPhoto(`visits/${emp}/${wib}/${visit_id}.jpg`, photoBuf);
    if (path) await q(`UPDATE sjp_visit_log SET photo_path=$2 WHERE visit_id=$1`, [visit_id, path]);
    else await q(`UPDATE sjp_visit_log SET photo=$2 WHERE visit_id=$1`, [visit_id, photoBuf]);
  }

  // Usulan GPS baru -> antrean approval admin (1 PENDING per customer, terbaru menimpa)
  if (geoProposal && cust_code) {
    await q(
      `INSERT INTO sjp_geo_approval
         (cust_code, emp_id, visit_id, old_lat, old_lng, new_lat, new_lng, distance_m, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING')
       ON CONFLICT (cust_code) WHERE status='PENDING'
       DO UPDATE SET emp_id=EXCLUDED.emp_id, visit_id=EXCLUDED.visit_id,
         old_lat=EXCLUDED.old_lat, old_lng=EXCLUDED.old_lng,
         new_lat=EXCLUDED.new_lat, new_lng=EXCLUDED.new_lng,
         distance_m=EXCLUDED.distance_m, created_at=now()`,
      [cust_code, emp, ins?.visit_id ?? null, geoProposal.old_lat, geoProposal.old_lng, lat, lng, gps_distance]
    );
  }

  if (sched_id) await q(`UPDATE sjp_schedule SET status='DONE' WHERE sched_id=$1`, [sched_id]);

  redirect("/sales/sukses");
}
