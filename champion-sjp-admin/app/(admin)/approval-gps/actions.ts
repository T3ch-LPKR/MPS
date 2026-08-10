"use server";

import { revalidatePath } from "next/cache";
import { q, q1 } from "@/lib/db";
import { getSession } from "@/lib/session";

async function decidedBy() {
  const s = await getSession();
  return s?.username || "admin";
}

// Approve 1 usulan: pindahkan titik master ke lokasi baru, kunjungan pemicu jadi valid.
export async function approveGeo(formData: FormData) {
  const id = Number(formData.get("geo_appr_id"));
  if (!id) return;
  const by = await decidedBy();
  const p = await q1<{ cust_code: string; new_lat: number; new_lng: number; visit_id: number | null }>(
    `SELECT cust_code, new_lat, new_lng, visit_id
       FROM sjp_geo_approval WHERE geo_appr_id=$1 AND status='PENDING'`, [id]);
  if (!p) return;
  await q(
    `UPDATE sjp_customer_geo SET lat=$2, lng=$3, source='admin', updated_at=now() WHERE cust_code=$1`,
    [p.cust_code, p.new_lat, p.new_lng]);
  if (p.visit_id)
    await q(`UPDATE sjp_visit_log SET gps_valid=true, gps_distance_m=0 WHERE visit_id=$1`, [p.visit_id]);
  await q(`UPDATE sjp_geo_approval SET status='APPROVED', decided_by=$2, decided_at=now() WHERE geo_appr_id=$1`, [id, by]);
  revalidatePath("/approval-gps");
}

// Tolak 1 usulan: kunjungan pemicu dianggap OOS (schedule TETAP DONE — tak diubah).
export async function rejectGeo(formData: FormData) {
  const id = Number(formData.get("geo_appr_id"));
  if (!id) return;
  const by = await decidedBy();
  const p = await q1<{ visit_id: number | null }>(
    `SELECT visit_id FROM sjp_geo_approval WHERE geo_appr_id=$1 AND status='PENDING'`, [id]);
  if (!p) return;
  if (p.visit_id) await q(`UPDATE sjp_visit_log SET is_oos=true WHERE visit_id=$1`, [p.visit_id]);
  await q(`UPDATE sjp_geo_approval SET status='REJECTED', decided_by=$2, decided_at=now() WHERE geo_appr_id=$1`, [id, by]);
  revalidatePath("/approval-gps");
}

// Approve SEMUA usulan PENDING (hormati filter salesman bila ada).
export async function approveAllGeo(formData: FormData) {
  const emp = String(formData.get("femp") || "").trim();
  const by = await decidedBy();
  await q(
    `UPDATE sjp_customer_geo g SET lat=a.new_lat, lng=a.new_lng, source='admin', updated_at=now()
       FROM sjp_geo_approval a
      WHERE a.cust_code=g.cust_code AND a.status='PENDING' AND ($1='' OR a.emp_id=$1)`, [emp]);
  await q(
    `UPDATE sjp_visit_log v SET gps_valid=true, gps_distance_m=0
       FROM sjp_geo_approval a
      WHERE a.visit_id=v.visit_id AND a.status='PENDING' AND ($1='' OR a.emp_id=$1)`, [emp]);
  await q(
    `UPDATE sjp_geo_approval SET status='APPROVED', decided_by=$2, decided_at=now()
      WHERE status='PENDING' AND ($1='' OR emp_id=$1)`, [emp, by]);
  revalidatePath("/approval-gps");
}
