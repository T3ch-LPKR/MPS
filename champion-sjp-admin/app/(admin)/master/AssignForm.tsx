"use client";

import { useFormState } from "react-dom";
import { addAssignment } from "./actions";
import CustomerSearch from "./CustomerSearch";

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function AssignForm({ salesmen }: { salesmen: { emp_id: string; emp_name: string }[] }) {
  const [state, action] = useFormState(addAssignment as any, {} as any);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="lbl">Salesman</label>
        <select name="emp_id" className="inp" required>
          <option value="">— pilih —</option>
          {salesmen.map((s) => (
            <option key={s.emp_id} value={s.emp_id}>{s.emp_name} ({s.emp_id})</option>
          ))}
        </select>
      </div>
      <CustomerSearch />

      <div>
        <label className="lbl">Frekuensi</label>
        <select name="frekuensi" className="inp">
          <option value="W">Weekly (1×/minggu)</option>
          <option value="BW">Bi-Weekly (1×/2 minggu)</option>
          <option value="M">Monthly (1×/bulan)</option>
          <option value="C">Custom</option>
        </select>
      </div>
      <div>
        <label className="lbl">Hari kunjungan</label>
        <div className="flex flex-wrap gap-2">
          {HARI.map((h, i) => (
            <label key={i} className="flex items-center gap-1.5 text-sm border border-line rounded-full px-3 py-1.5 cursor-pointer has-[:checked]:bg-brand-soft has-[:checked]:border-brand">
              <input type="checkbox" name={`hari_${i}`} className="accent-brand" /> {h}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="lbl">Minggu ke- (untuk Monthly, opsional)</label>
        <input name="minggu_ke" type="number" min={1} max={4} className="inp" placeholder="1–4" />
      </div>
      {state?.error ? <div className="text-sm text-bad">{state.error}</div> : null}
      {state?.ok ? <div className="text-sm text-ok">Tersimpan ✓</div> : null}
      <button className="btn btn-pri w-full justify-center">＋ Simpan Assignment</button>
    </form>
  );
}
