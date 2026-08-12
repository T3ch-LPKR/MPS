import { redirect } from "next/navigation";
import { q1 } from "@/lib/db";
import { getBoolSetting } from "@/lib/settings";

// Bila "wajib absen masuk" aktif & salesman belum absen masuk hari ini -> paksa ke /sales/absen.
// Ringan: hanya 1 query kecil, dan hanya bila setting ON. Aman untuk admin/hos preview (emp null -> lewat).
export async function requireClockIn(emp: string | null | undefined) {
  if (!emp) return;
  const mandatory = await getBoolSetting("attendance_masuk_mandatory", false);
  if (!mandatory) return;
  const masuk = await q1(
    `SELECT 1 FROM sjp_attendance WHERE emp_id=$1 AND tgl=CURRENT_DATE AND mode='MASUK'`, [emp]);
  if (!masuk) redirect("/sales/absen");
}
