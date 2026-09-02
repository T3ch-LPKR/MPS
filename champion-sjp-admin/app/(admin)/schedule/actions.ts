"use server";

import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { scheduledOn } from "@/lib/scheduleRule";

export async function generateSchedule(_prev: any, formData: FormData) {
  const weekStart = String(formData.get("week_start") || ""); // YYYY-MM-DD (Senin)
  if (!weekStart) return { ok: false, error: "Minggu tidak valid" };
  const monday = new Date(weekStart + "T00:00:00");

  const assigns = await q<any>(
    `SELECT assign_id, cust_code, emp_id, frekuensi, hari_mask, minggu_ke FROM sjp_assignment WHERE is_active`
  );

  const rows: any[] = [];
  for (let i = 0; i < 6; i++) {
    // i: 0=Senin .. 5=Sabtu
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    for (const a of assigns) {
      if (!scheduledOn(a, d)) continue;
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      rows.push([ymd, a.emp_id, a.cust_code, a.assign_id]);
    }
  }

  if (rows.length === 0) {
    revalidatePath("/schedule");
    return { ok: true, inserted: 0, candidates: 0, message: "Tidak ada assignment untuk minggu ini." };
  }

  // Bulk insert + hitung yang benar-benar baru (RETURNING)
  const params: any[] = [];
  const values = rows.map((r, i) => {
    const b = i * 4;
    params.push(r[0], r[1], r[2], r[3]);
    return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},'PLANNED')`;
  }).join(",");
  const inserted = await q(
    `INSERT INTO sjp_schedule (tgl, emp_id, cust_code, assign_id, status)
     VALUES ${values}
     ON CONFLICT (tgl, emp_id, cust_code) DO NOTHING
     RETURNING sched_id`,
    params
  );

  revalidatePath("/schedule");
  return {
    ok: true,
    inserted: inserted.length,
    candidates: rows.length,
    message: `${inserted.length} jadwal baru dibuat (${rows.length - inserted.length} sudah ada).`,
  };
}
