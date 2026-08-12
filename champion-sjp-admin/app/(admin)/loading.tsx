// Loading otomatis saat pindah menu admin.
export default function Loading() {
  return (
    <div className="p-12 flex flex-col items-center justify-center gap-3 text-mut">
      <span className="w-8 h-8 rounded-full border-4 border-brand border-t-transparent animate-spin inline-block" />
      <div className="text-sm font-medium">Memuat…</div>
    </div>
  );
}
