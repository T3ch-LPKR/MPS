"use client";

import { useFormState } from "react-dom";
import { generateSchedule } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export default function GenerateButton({ weekStart }: { weekStart: string }) {
  const [state, action] = useFormState(generateSchedule as any, {} as any);
  return (
    <div className="flex items-center gap-2">
      <form action={action}>
        <input type="hidden" name="week_start" value={weekStart} />
        <SubmitButton className="btn btn-pri" pendingText="Memproses jadwal…">⚙ Generate Jadwal Minggu Ini</SubmitButton>
      </form>
      {state?.ok ? (
        <span className="pill p-ok">✓ {state.message}</span>
      ) : state?.error ? (
        <span className="pill p-bad">{state.error}</span>
      ) : null}
    </div>
  );
}
