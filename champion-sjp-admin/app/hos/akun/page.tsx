"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { changeOwnPassword } from "../../sales/akun/actions";
import SubmitButton from "@/components/SubmitButton";

export default function HosAkun() {
  const [state, action] = useFormState(changeOwnPassword as any, {} as any);
  return (
    <div className="p-4 space-y-3">
      <Link href="/hos" className="text-brand text-sm">‹ Kembali</Link>
      <div className="bg-white rounded-xl p-4">
        <div className="font-bold mb-3">Ganti Password</div>
        <form action={action} className="space-y-3">
          <div><label className="lbl">Password lama</label><input name="old" type="password" className="inp" required /></div>
          <div><label className="lbl">Password baru</label><input name="new" type="password" className="inp" required /></div>
          <div><label className="lbl">Ulangi password baru</label><input name="new2" type="password" className="inp" required /></div>
          {state?.error ? <div className="text-sm text-bad bg-[#fdeaea] rounded-lg px-3 py-2">{state.error}</div> : null}
          {state?.ok ? <div className="text-sm text-ok bg-[#e7f6ec] rounded-lg px-3 py-2">✓ Password berhasil diganti.</div> : null}
          <SubmitButton className="btn btn-pri w-full justify-center">Simpan Password Baru</SubmitButton>
        </form>
      </div>
    </div>
  );
}
