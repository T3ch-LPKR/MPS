import { getBoolSetting } from "@/lib/settings";
import { saveSettings } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  const photoMandatory = await getBoolSetting("photo_mandatory", true);
  return (
    <>
      <div className="mb-1 text-xl font-bold">Pengaturan</div>
      <div className="text-sm text-mut mb-5">Konfigurasi aplikasi SJP</div>

      <div className="card p-5 max-w-lg">
        <form action={saveSettings} className="space-y-4">
          <div className="font-bold">Check-in Salesman</div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" name="photo_mandatory" defaultChecked={photoMandatory} className="mt-1 accent-brand w-4 h-4" />
            <span>
              <span className="font-semibold text-sm">Foto selfie wajib saat check-in</span>
              <span className="block text-xs text-mut">Jika aktif, salesman TIDAK bisa submit tanpa foto. Jika nonaktif, foto opsional.</span>
            </span>
          </label>
          <SubmitButton className="btn btn-pri">Simpan Pengaturan</SubmitButton>
        </form>
      </div>
    </>
  );
}
