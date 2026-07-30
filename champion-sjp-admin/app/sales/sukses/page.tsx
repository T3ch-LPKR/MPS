import Link from "next/link";

export default function Sukses() {
  return (
    <div className="p-6 min-h-[70vh] grid place-items-center text-center">
      <div>
        <div className="w-24 h-24 rounded-full bg-[#e7f6ec] text-ok grid place-items-center text-5xl mx-auto mb-5">✓</div>
        <h1 className="text-xl font-extrabold mb-1">Kunjungan Tersimpan!</h1>
        <p className="text-sm text-mut mb-6">Evidence terkirim ke server.</p>
        <Link href="/sales" className="btn btn-pri w-full justify-center py-3">Lanjut Kunjungan Berikutnya</Link>
        <Link href="/sales/riwayat" className="btn w-full justify-center mt-2">Lihat Riwayat</Link>
      </div>
    </div>
  );
}
