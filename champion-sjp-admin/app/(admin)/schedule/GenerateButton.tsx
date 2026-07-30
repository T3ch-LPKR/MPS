"use client";

import { useFormState, useFormStatus } from "react-dom";
import { generateSchedule } from "./actions";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-pri" disabled={pending}>
      {pending ? "⏳ Memproses jadwal…" : "⚙ Generate Jadwal Minggu Ini"}
    </button>
  );
}

export default function GenerateButton({ weekStart }: { weekStart: string }) {
  const [state, action] = useFormState(generateSchedule as any, {} as any);
  return (
    <div className="flex items-center gap-2">
      <form action={action}>
        <input type="hidden" name="week_start" value={weekStart} />
        <Btn />
      </form>
      {state?.ok ? (
        <span className="pill p-ok">✓ {state.message}</span>
      ) : state?.error ? (
        <span className="pill p-bad">{state.error}</span>
      ) : null}
    </div>
  );
}
