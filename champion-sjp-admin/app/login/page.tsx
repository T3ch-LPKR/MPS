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
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-brand via-brand-dark to-[#7d1015] px-6">
      <div className="w-full max-w-sm">
        <div className="w-20 h-20 rounded-2xl bg-white text-brand grid place-items-center text-4xl font-black italic mx-auto mb-4 shadow-lg">
          C
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
