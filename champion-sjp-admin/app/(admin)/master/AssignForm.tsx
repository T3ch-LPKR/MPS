"use client";

import { useFormState } from "react-dom";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addAssignment } from "./actions";
import CustomerSearch from "./CustomerSearch";
import SubmitButton from "@/components/SubmitButton";

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

type Initial = {
  assign_id: number;
  cust_code: string;
  cust_name: string;
  emp_id: string;
  frekuensi: string;
  hari_mask: number;
  minggu_ke: number | null;
};

export default function AssignForm({
  salesmen,
  initial,
}: {
  salesmen: { emp_id: string; emp_name: string }[];
  initial?: Initial | null;
}) {
  const [state, action] = useFormState(addAssignment as any, {} as any);
  const editing = !!initial;
  const [frekuensi, setFrekuensi] = useState(initial?.frekuensi || "W");
  const router = useRouter();
  const doneRef = useRef<any>(null);

  // setelah sukses simpan → arahkan kalender ke salesman itu & muat ulang data
  useEffect(() => {
    if (state?.ok && state.emp_id && doneRef.current !== state) {
      doneRef.current = state;
      router.push(`/master?tab=assign&cal_emp=${encodeURIComponent(state.emp_id)}`);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-bold">{editing ? "Edit Assignment" : "Assign Customer → Salesman"}</div>
        {editing ? (
          <Link href="/master?tab=assign" className="text-xs text-brand underline">+ Assign baru</Link>
        ) : null}
      </div>

      {editing ? <input type="hidden" name="assign_id" value={initial!.assign_id} /> : null}

      <div>
        <label className="lbl">Salesman</label>
        <select name="emp_id" className="inp" required defaultValue={initial?.emp_id || ""}>
          <option value="">— pilih —</option>
          {salesmen.map((s) => (
            <option key={s.emp_id} value={s.emp_id}>{s.emp_name} ({s.emp_id})</option>
          ))}
        </select>
      </div>

      <CustomerSearch initialCode={initial?.cust_code} initialName={initial?.cust_name} />

      <div>
        <label className="lbl">Frekuensi</label>
        <select
          name="frekuensi"
          className="inp"
          value={frekuensi}
          onChange={(e) => setFrekuensi(e.target.value)}
        >
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
              <input
                type="checkbox"
                name={`hari_${i}`}
                className="accent-brand"
                defaultChecked={initial ? Boolean(initial.hari_mask & (1 << i)) : false}
              />{" "}
              {h}
            </label>
          ))}
        </div>
      </div>

      {frekuensi === "BW" ? (
        <div>
          <label className="lbl">Pola Bi-Weekly</label>
          <select name="minggu_ke" className="inp" defaultValue={initial?.minggu_ke === 2 ? "2" : "1"}>
            <option value="1">Minggu 1 &amp; 3 dalam bulan</option>
            <option value="2">Minggu 2 &amp; 4 dalam bulan</option>
          </select>
          <div className="text-[11px] text-mut mt-1">Kunjungan tiap 2 minggu di hari yang dipilih.</div>
        </div>
      ) : frekuensi === "M" ? (
        <div>
          <label className="lbl">Minggu ke- (untuk Monthly)</label>
          <input
            name="minggu_ke"
            type="number"
            min={1}
            max={4}
            className="inp"
            placeholder="1–4 (kosong = minggu 1)"
            defaultValue={initial?.minggu_ke ?? ""}
          />
        </div>
      ) : null}

      {state?.error ? <div className="text-sm text-bad">{state.error}</div> : null}
      {state?.ok ? <div className="text-sm text-ok">Tersimpan ✓{state.edited ? " (diubah)" : ""}</div> : null}

      <SubmitButton className="btn btn-pri w-full justify-center">
        {editing ? "💾 Simpan Perubahan" : "＋ Simpan Assignment"}
      </SubmitButton>
    </form>
  );
}
