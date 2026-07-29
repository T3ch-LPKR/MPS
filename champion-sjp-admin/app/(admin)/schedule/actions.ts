"use server";

import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";

// weekOfMonth: minggu ke berapa tanggal ini dalam bulannya (1..5)
function weekOfMonth(d: Date) {
  return Math.ceil(d.getDate() / 7);
}
// isoWeek untuk parity bi-weekly
function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
}

export async function generateSchedule(formData: FormData) {
  const weekStart = String(formData.get("week_start") || ""); // YYYY-MM-DD (Senin)
  if (!weekStart) return;
  const monday = new Date(weekStart + "T00:00:00");

  const assigns = await q<any>(
    `SELECT assign_id, cust_code, emp_id, frekuensi, hari_mask, minggu_ke FROM sjp_assignment WHERE is_active`
  );

  const rows: any[] = [];
  for (let i = 0; i < 6; i++) {
    // i: 0=Senin .. 5=Sabtu
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const bit = 1 << i;
    const wk = isoWeek(d);
    const wom = weekOfMonth(d);
    for (const a of assigns) {
      if (!(a.hari_mask & bit)) continue;
      let take = false;
      if (a.frekuensi === "W" || a.frekuensi === "C") take = true;
      else if (a.frekuensi === "BW") take = wk % 2 === 0;
      else if (a.frekuensi === "M") take = a.minggu_ke ? wom === a.minggu_ke : wom === 1;
      if (!take) continue;
      const ymd = d.toISOString().slice(0, 10);
      rows.push([ymd, a.emp_id, a.cust_code, a.assign_id]);
    }
  }

  for (const r of rows) {
    await q(
      `INSERT INTO sjp_schedule (tgl, emp_id, cust_code, status, assign_id)
       VALUES ($1,$2,$3,'PLANNED',$4)
       ON CONFLICT (tgl, emp_id, cust_code) DO NOTHING`,
      r
    );
  }
  revalidatePath("/schedule");
}
