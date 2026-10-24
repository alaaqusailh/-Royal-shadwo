"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminApiError } from "@/components/admin/api-error";
import { adminLabel } from "@/lib/admin/localization";

const nextStatus = {
  PENDING: [],
  PAID: ["PROCESSING"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
} as const;

type Status = keyof typeof nextStatus;

export function OrderStatusControl({ orderId, status }: { orderId: string; status: Status }) {
  const choices = nextStatus[status];
  const router = useRouter();
  const [selected, setSelected] = useState<string>(choices[0] ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function updateStatus() {
    if (!selected) return;
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/admin/v1/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: selected }),
      });
      if (!response.ok) throw new Error(await getAdminApiError(response, "تعذر تحديث حالة الطلب."));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحديث حالة الطلب.");
    } finally {
      setPending(false);
    }
  }

  if (choices.length === 0) return <span className="text-xs text-neutral-400">—</span>;

  return (
    <div className="flex min-w-52 flex-col gap-2">
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`order-status-${orderId}`}>الحالة التالية للطلب</label>
        <select id={`order-status-${orderId}`} value={selected} onChange={(event) => setSelected(event.target.value)} className="min-h-9 min-w-28 rounded-lg border border-neutral-300 bg-white px-2 text-xs">
          {choices.map((choice) => <option key={choice} value={choice}>{adminLabel(choice)}</option>)}
        </select>
        <button type="button" onClick={updateStatus} disabled={pending || !selected} className="min-h-9 rounded-lg bg-neutral-900 px-3 text-xs font-medium text-white disabled:opacity-50">
          {pending ? "جارٍ الحفظ…" : "تحديث"}
        </button>
      </div>
      {error && <p role="alert" className="max-w-52 text-[10px] leading-4 text-red-700">{error}</p>}
    </div>
  );
}
