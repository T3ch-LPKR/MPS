import { getBoolSetting } from "@/lib/settings";
import { saveSettings } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

function Toggle({ name, checked, title, desc }: { name: string; checked: boolean; title: string; desc: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-1 accent-brand w-4 h-4" />
      <span>
        <span className="font-semibold text-sm">{title}</span>
        <span className="block text-xs text-mut">{desc}</span>
      </span>
    </label>
  );
}

export default async function PengaturanPage() {
  const photoMandatory = await getBoolSetting("photo_mandatory", true);
  const absMasuk = await getBoolSetting("attendance_masuk_mandatory", false);
  const absPulang = await getBoolSetting("attendance_pulang_mandatory", false);
  const absPhoto = await getBoolSetting("attendance_photo_mandatory", true);
  return (
    <>
      <div className="mb-1 text-xl font-bold">Pengaturan</div>
      <div className="text-sm text-mut mb-5">Konfigurasi aplikasi SJP</div>

      <div className="card p-5 max-w-lg">
        <form action={saveSettings} className="space-y-5">
          <div>
            <div className="font-bold mb-3">Check-in Salesman</div>
            <Toggle name="photo_mandatory" checked={photoMandatory}
              title="Foto selfie wajib saat check-in"
              desc="Jika aktif, salesman TIDAK bisa submit tanpa foto. Jika nonaktif, foto opsional." />
          </div>

          <div className="border-t border-line pt-4 space-y-3">
            <div className="font-bold">Absensi Salesman</div>
            <Toggle name="attendance_masuk_mandatory" checked={absMasuk}
              title="Wajib absen masuk"
              desc="Jika aktif, salesman HARUS absen masuk dulu sebelum bisa membuka kunjungan." />
            <Toggle name="attendance_pulang_mandatory" checked={absPulang}
              title="Wajib absen pulang"
              desc="Jika aktif, salesman diingatkan absen pulang di sore hari (ditandai jika belum)." />
            <Toggle name="attendance_photo_mandatory" checked={absPhoto}
              title="Foto selfie wajib saat absen"
              desc="Jika aktif, absen masuk/pulang harus dengan selfie." />
          </div>

          <SubmitButton className="btn btn-pri">Simpan Pengaturan</SubmitButton>
        </form>
      </div>
    </>
  );
}
