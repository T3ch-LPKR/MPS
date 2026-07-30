"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { addUser } from "./actions";

export default function AddUserForm({ salesmen, isSuper }: { salesmen: { emp_id: string; emp_name: string }[]; isSuper: boolean }) {
  const [state, action] = useFormState(addUser as any, {} as any);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div><label className="lbl">Username</label><input name="username" className="inp" required /></div>
      <div><label className="lbl">Password</label><input name="password" type="password" className="inp" required /></div>
      <div><label className="lbl">Nama lengkap</label><input name="full_name" className="inp" /></div>
      <div><label className="lbl">Role</label>
        <select name="role" className="inp">
          <option value="admin">Admin</option>
          <option value="hos">Head of Sales</option>
          <option value="salesman">Salesman</option>
          {isSuper ? <option value="superadmin">Super Admin</option> : null}
        </select></div>
      <div><label className="lbl">Link Salesman (untuk role Salesman)</label>
        <select name="emp_id" className="inp"><option value="">—</option>
          {salesmen.map((s) => <option key={s.emp_id} value={s.emp_id}>{s.emp_name} ({s.emp_id})</option>)}</select></div>

      {state?.error ? <div className="text-sm text-bad bg-[#fdeaea] rounded-lg px-3 py-2">{state.error}</div> : null}
      {state?.ok ? <div className="text-sm text-ok bg-[#e7f6ec] rounded-lg px-3 py-2">✓ {state.message}</div> : null}

      <button className="btn btn-pri w-full justify-center">＋ Tambah User</button>
      {!isSuper ? <p className="text-[11px] text-mut">Hanya Super Admin yang bisa membuat/mengubah akun Super Admin.</p> : null}
    </form>
  );
}
