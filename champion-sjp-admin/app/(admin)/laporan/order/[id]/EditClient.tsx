"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OrderItemsSection, { orderProblem, type OrderData } from "@/app/sales/OrderItemsSection";
import { updateOrderAdmin } from "./actions";

export default function EditClient({ orderId, initial }: { orderId: number; initial: OrderData }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const problem = orderProblem(order);

  async function save() {
    if (problem || busy) return;
    setBusy(true); setMsg("");
    try {
      const r = await updateOrderAdmin(orderId, order);
      if (r.ok) { router.push("/laporan/order"); router.refresh(); return; }
      setMsg(r.error || "Gagal menyimpan.");
    } catch { setMsg("Gagal menyimpan."); }
    setBusy(false);
  }

  return (
    <div className="space-y-3 max-w-xl">
      <OrderItemsSection value={order} onChange={setOrder} />
      {msg ? <div className="text-sm text-bad bg-[#fdeaea] rounded-lg px-3 py-2">{msg}</div> : null}
      {problem ? <div className="text-[11px] text-mut">{problem}</div> : null}
      <button type="button" onClick={save} disabled={!!problem || busy} className="btn btn-pri">
        {busy ? "Menyimpan…" : "💾 Simpan Perubahan"}
      </button>
    </div>
  );
}
