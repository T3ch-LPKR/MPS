"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createNews } from "./actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-pri" disabled={pending} aria-busy={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
          Menyimpan…
        </span>
      ) : "＋ Terbitkan Berita"}
    </button>
  );
}

const ROLES: { v: string; l: string }[] = [
  { v: "salesman", l: "Salesman" },
  { v: "hos", l: "Head of Sales" },
  { v: "collector", l: "Collector" },
];

export default function NewsForm() {
  const [state, action] = useFormState(createNews as any, {} as any);
  const [photo, setPhoto] = useState("");
  const [formKey, setFormKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // reset form setelah sukses
  useEffect(() => {
    if (state?.ok) { setPhoto(""); setFormKey((k) => k + 1); }
  }, [state]);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const max = 1000, scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      cv.getContext("2d")!.drawImage(img, 0, 0, w, h);
      setPhoto(cv.toDataURL("image/jpeg", 0.7));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <form key={formKey} action={action} className="space-y-3">
      <input type="hidden" name="photo" value={photo} />
      <div>
        <label className="lbl">Judul <span className="text-brand">*</span></label>
        <input name="title" className="inp" placeholder="mis. Target penjualan bulan ini" />
      </div>
      <div>
        <label className="lbl">Isi Berita</label>
        <textarea name="body" rows={3} className="inp" placeholder="Tulis pengumuman…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="lbl">Mulai <span className="text-brand">*</span></label>
          <input type="date" name="start_date" className="inp" />
        </div>
        <div>
          <label className="lbl">Selesai <span className="text-brand">*</span></label>
          <input type="date" name="end_date" className="inp" />
        </div>
      </div>
      <div>
        <label className="lbl">Target <span className="text-brand">*</span></label>
        <div className="flex flex-wrap gap-3">
          {ROLES.map((r) => (
            <label key={r.v} className="inline-flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="roles" value={r.v} defaultChecked={r.v === "salesman"} /> {r.l}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="lbl">Foto (opsional)</label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-sm">📷 Pilih Foto</button>
          {photo ? <img src={photo} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-line" /> : <span className="text-xs text-mut">belum ada foto</span>}
          {photo ? <button type="button" onClick={() => setPhoto("")} className="text-xs text-bad underline">hapus</button> : null}
        </div>
      </div>

      {state?.error ? <div className="text-sm text-bad bg-[#fdeaea] rounded-lg px-3 py-2">{state.error}</div> : null}
      {state?.ok ? <div className="text-sm text-ok bg-[#e7f6ec] rounded-lg px-3 py-2">Berita terbit.</div> : null}
      <SubmitBtn />
    </form>
  );
}
