"use client";

import { useFormState } from "react-dom";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addAssignment } from "./actions";
import CustomerSearch from "./CustomerSearch";
import SubmitButton from "@/components/SubmitButton";

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MAX_CUSTOM = 4;
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

type Initial = {
  assign_id: number;
  cust_code: string;
  cust_name: string;
  emp_id: string;
  frekuensi: string;
  hari_mask: number;
  minggu_ke: number | null;
  custom_dates?: string[] | null; // YYYY-MM-DD (frekuensi C)
};

// Mini-kalender pemilih tanggal untuk frekuensi Custom (maks 4 tanggal, Minggu libur).
function CustomDatePicker({ dates, onChange }: { dates: string[]; onChange: (d: string[]) => void }) {
  const now = new Date();
  const [ym, setYm] = useState<[number, number]>([now.getFullYear(), now.getMonth()]); // [tahun, 0-11]
  const [yy, mm] = ym;
  const lastDay = new Date(yy, mm + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const toYmd = (day: number) => `${yy}-${pad(mm + 1)}-${pad(day)}`;
  const full = dates.length >= MAX_CUSTOM;

  const toggle = (day: number) => {
    const v = toYmd(day);
    if (dates.includes(v)) onChange(dates.filter((x) => x !== v));
    else if (!full) onChange([...dates, v].sort());
  };
  const fmt = (v: string) => {
    const [, m, d] = v.split("-").map(Number);
    return `${d} ${BULAN[m - 1]}`;
  };

  // grid: kolom Sen..Sab (Minggu tidak ditampilkan — libur)
  const cells: (number | null)[] = [];
  for (let day = 1; day <= lastDay; day++) {
    const dow = (new Date(yy, mm, day).getDay() + 6) % 7; // 0=Sen..6=Min
    if (dow === 6) continue; // skip Minggu
    if (day === 1 || cells.length === 0) for (let i = 0; i < dow; i++) cells.push(null);
    else if (dow === 0) { /* baris baru rapi: isi sisa kolom */ while (cells.length % 6 !== 0) cells.push(null); }
    cells.push(day);
  }
  while (cells.length % 6 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <button type="button" className="btn btn-sm" onClick={() => setYm(mm === 0 ? [yy - 1, 11] : [yy, mm - 1])}>‹</button>
        <div className="text-sm font-bold">{BULAN[mm]} {yy}</div>
        <button type="button" className="btn btn-sm" onClick={() => setYm(mm === 11 ? [yy + 1, 0] : [yy, mm + 1])}>›</button>
      </div>
      <div className="grid grid-cols-6 gap-1 text-center text-[11px] text-mut font-semibold mb-1">
        {HARI.map((h) => <div key={h}>{h}</div>)}
      </div>
      <div className="grid grid-cols-6 gap-1">
        {cells.map((day, i) => day == null ? <div key={i} /> : (() => {
          const v = toYmd(day);
          const on = dates.includes(v);
          return (
            <button type="button" key={i} onClick={() => toggle(day)}
              disabled={!on && full}
              className={`py-1.5 rounded-lg text-sm border ${on ? "bg-brand text-white border-brand font-bold" : "bg-white border-line hover:bg-brand-soft disabled:opacity-35 disabled:cursor-not-allowed"}`}>
              {day}
            </button>
          );
        })())}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2 items-center">
        {dates.length === 0 ? <span className="text-[11px] text-mut">Belum ada tanggal dipilih.</span> :
          dates.map((v) => (
            <span key={v} className="pill p-info">
              {fmt(v)}
              <button type="button" className="ml-0.5 font-bold" onClick={() => onChange(dates.filter((x) => x !== v))}>×</button>
            </span>
          ))}
        <span className={`text-[11px] ${full ? "text-warn font-semibold" : "text-mut"}`}>({dates.length}/{MAX_CUSTOM}{full ? " — maks. 4 tanggal" : ""})</span>
      </div>
    </div>
  );
}

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
  const [customDates, setCustomDates] = useState<string[]>(initial?.custom_dates || []);
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

      {frekuensi === "C" ? (
        <div>
          <label className="lbl">Tanggal kunjungan <span className="text-mut font-normal text-[11px]">(bebas, maks. {MAX_CUSTOM} tanggal, tanpa pola)</span></label>
          <input type="hidden" name="custom_dates" value={customDates.join(",")} />
          <CustomDatePicker dates={customDates} onChange={setCustomDates} />
        </div>
      ) : (
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
      )}

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
