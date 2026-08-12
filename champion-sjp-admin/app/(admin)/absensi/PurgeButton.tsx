"use client";

import { useFormState, useFormStatus } from "react-dom";
import { purgeOldPhotos } from "./actions";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-sm" disabled={pending} aria-busy={pending}>
      {pending ? "Menghapus…" : "🗑 Hapus foto > 30 hari (absensi+kunjungan)"}
    </button>
  );
}

export default function PurgeButton() {
  const [state, action] = useFormState(purgeOldPhotos as any, {} as any);
  return (
    <form action={action}
      onSubmit={(e) => { if (!confirm("Hapus semua FOTO (absensi + kunjungan) lebih dari 30 hari? Data (jam/lokasi/catatan) tetap tersimpan, hanya foto yang dihapus dari Storage. Tindakan ini tidak bisa dibatalkan.")) e.preventDefault(); }}
      className="inline-flex items-center gap-2">
      <Btn />
      {state?.ok ? <span className="text-xs text-ok">{state.deleted} foto dihapus.</span> : null}
      {state?.error ? <span className="text-xs text-bad">{state.error}</span> : null}
    </form>
  );
}
