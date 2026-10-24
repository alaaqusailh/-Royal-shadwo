"use client";

import { useActionState } from "react";
import { adjustInventory, type InventoryAdjustmentState } from "@/app/admin/(dashboard)/inventory/actions";

export function InventoryAdjustmentForm({ inventoryId }: { inventoryId: string }) {
  const [state, formAction, pending] = useActionState<InventoryAdjustmentState, FormData>(adjustInventory, {});

  return (
    <div className="min-w-52">
      <form
        action={formAction}
        className="flex items-end gap-2"
        onSubmit={(event) => {
          const delta = Number(new FormData(event.currentTarget).get("delta"));
          if (delta < 0 && !window.confirm("هل تريد تقليل كمية المخزون المتاحة بهذا المقدار؟")) event.preventDefault();
        }}
      >
        <input type="hidden" name="inventoryId" value={inventoryId} />
        <label className="min-w-20 text-[10px] font-medium text-neutral-600">
          التغيير (+ / −)
          <input name="delta" type="number" min="-10000" max="10000" step="1" required className="mt-1 min-h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm" />
        </label>
        <label className="min-w-28 text-[10px] font-medium text-neutral-600">
          السبب
          <input name="reason" type="text" minLength={3} maxLength={300} required className="mt-1 min-h-9 w-full rounded-lg border border-neutral-300 px-2 text-sm" />
        </label>
        <button disabled={pending} className="min-h-9 rounded-lg bg-neutral-900 px-3 text-xs font-medium text-white disabled:opacity-50">{pending ? "جارٍ الحفظ…" : "حفظ"}</button>
      </form>
      {state.error && <p role="alert" className="mt-2 text-[10px] leading-4 text-red-700">{state.error === "unauthorized" ? "لا تسمح صلاحيتك بتعديل المخزون." : state.error === "insufficient_stock" ? "الكمية المتاحة لا تكفي لهذا التخفيض." : state.error === "validation" ? "أدخل كمية غير صفرية وسبب التعديل." : "تعذر تعديل المخزون. حاول مرة أخرى."}</p>}
      {state.success && <p role="status" className="mt-2 text-[10px] text-emerald-700">تم تحديث {state.success}</p>}
    </div>
  );
}
