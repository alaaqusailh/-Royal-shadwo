"use client";

import { useActionState } from "react";
import { cancelPendingOrder, type CancelOrderState } from "@/app/admin/(dashboard)/orders/actions";

export function CancelOrderForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState<CancelOrderState, FormData>(cancelPendingOrder, {});

  return (
    <div className="min-w-28">
      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm("هل تريد إلغاء الطلب المعلق وتحرير مخزونه المحجوز؟")) event.preventDefault();
        }}
      >
        <input type="hidden" name="orderId" value={orderId} />
        <button disabled={pending} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50">
          {pending ? "جارٍ الإلغاء…" : "إلغاء الطلب"}
        </button>
      </form>
      {state.error && <p role="alert" className="mt-2 max-w-40 text-[10px] leading-4 text-red-700">{state.error === "unauthorized" ? "ليس لديك صلاحية لتنفيذ ذلك." : state.error === "not_pending" ? "لم يعد الطلب معلقًا." : "تعذر إلغاء الطلب. حاول مجددًا أو تواصل مع المسؤول."}</p>}
      {state.success && <p role="status" className="mt-2 text-[10px] text-emerald-700">تم إلغاء {state.success}</p>}
    </div>
  );
}
