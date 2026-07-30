"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { resetPassword } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export default function ResetPwForm({ userId }: { userId: number }) {
  const [state, action] = useFormState(resetPassword as any, {} as any);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);

  return (
    <form ref={ref} action={action} className="flex gap-1 items-center">
      <input type="hidden" name="user_id" value={userId} />
      <input name="password" type="password" className="inp !w-28 !py-1" placeholder="baru" />
      <SubmitButton className="btn btn-sm" pendingText="…">Set</SubmitButton>
      {state?.ok ? <span className="text-ok text-xs whitespace-nowrap">✓</span> : null}
      {state?.error ? <span className="text-bad text-xs whitespace-nowrap">✗</span> : null}
    </form>
  );
}
