"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OrderItemsSection, { orderProblem, type OrderData } from "../../OrderItemsSection";
import { updateOrderSales } from "./actions";

export default function EditClient({ visitId, initial, backHref }: { visitId: number; initial: OrderData; backHref: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const problem = orderProblem(order);

  async function save() {
    if (problem || busy) return;
    setBusy(true); setMsg("");
    try {
      const r = await updateOrderSales(visitId, order);
      if (r.ok) { router.push(backHref); router.refresh(); return; }
      setMsg(r.error || "Gagal menyimpan.");
    } catch { setMsg("Gagal menyimpan — periksa koneksi."); }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <OrderItemsSection value={order} onChange={setOrder} />
      {msg ? <div className="text-sm text-bad bg-[#fdeaea] rounded-lg px-3 py-2">{msg}</div> : null}
      {problem ? <div className="text-[11px] text-mut text-center">{problem}</div> : null}
      <button type="button" onClick={save} disabled={!!problem || busy} className="btn btn-pri w-full justify-center py-3">
        {busy ? "Menyimpan…" : "💾 Simpan Perubahan Order"}
      </button>
    </div>
  );
}
