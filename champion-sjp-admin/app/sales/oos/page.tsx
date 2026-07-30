import Link from "next/link";
import { q } from "@/lib/db";
import { getBoolSetting } from "@/lib/settings";
import OOSForm from "../OOSForm";

export const dynamic = "force-dynamic";

export default async function OOSPage() {
  const catatan = await q<any>(`SELECT lov_id, kode, teks FROM sjp_lov WHERE tipe='CATATAN' AND is_active ORDER BY kode`);
  const oos = await q<any>(`SELECT lov_id, kode, teks FROM sjp_lov WHERE tipe='OOS' AND is_active ORDER BY kode`);
  const photoMandatory = await getBoolSetting("photo_mandatory", true);
  return (
    <div className="p-4 space-y-3">
      <Link href="/sales" className="text-brand text-sm">‹ Kembali ke plan</Link>
      <div className="card p-3 bg-[#e8f0fe] border border-[#c7dbfc]">
        <div className="text-xs text-[#1e40af]">🔵 <b>Kunjungan Luar Jadwal (OOS)</b> — customer di luar plan hari ini. Pilih alasan & customer, lalu check-in.</div>
      </div>
      <div className="card p-4">
        <OOSForm catatanLov={catatan} oosLov={oos} photoMandatory={photoMandatory} />
      </div>
    </div>
  );
}
