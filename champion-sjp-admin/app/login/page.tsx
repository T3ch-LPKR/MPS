"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "./actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-pri w-full justify-center py-3">
      {pending ? "Memproses…" : "Masuk"}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState(loginAction, { error: "" as string });
  return (
    <div className="min-h-screen relative grid place-items-center px-6 overflow-hidden">
      {/* background image (taruh file di public/login-bg.jpg) */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      {/* overlay merah Champion agar teks terbaca */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand/85 via-brand-dark/85 to-[#7d1015]/90" />

      <div className="relative w-full max-w-sm">
        <div className="w-24 h-24 rounded-2xl bg-white grid place-items-center mx-auto mb-4 shadow-lg p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/champion.png" alt="Champion" className="max-w-full max-h-full object-contain" />
        </div>
        <h1 className="text-white text-center text-2xl font-bold">Champion SJP</h1>
        <p className="text-white/80 text-center text-sm mb-6">Admin · PT Multi Prima Sejahtera Tbk</p>
        <form action={action} className="bg-white rounded-2xl p-6 shadow-xl">
          <div className="mb-3">
            <label className="lbl">Username</label>
            <input name="username" className="inp" placeholder="admin" autoFocus />
          </div>
          <div className="mb-4">
            <label className="lbl">Password</label>
            <input name="password" type="password" className="inp" placeholder="••••••" />
          </div>
          {state?.error ? (
            <div className="mb-3 text-sm text-bad bg-[#fdeaea] border border-[#f5c2c2] rounded-lg px-3 py-2">
              {state.error}
            </div>
          ) : null}
          <SubmitBtn />
          <p className="text-center text-xs text-mut mt-3">SJP v1.0 · akses terbatas</p>
        </form>
      </div>
    </div>
  );
}
