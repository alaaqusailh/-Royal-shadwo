"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminApiError } from "@/components/admin/api-error";

export function ProductArchiveButton({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function archive() {
    if (!window.confirm("سيتم إخفاء المنتج وتعطيل خياراته مع الاحتفاظ بسجلاته التاريخية. هل تريد المتابعة؟")) {
      return;
    }

    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) throw new Error(await getAdminApiError(response, "تعذرت أرشفة المنتج."));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذرت أرشفة المنتج.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={archive}
        disabled={pending}
        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "جارٍ الأرشفة…" : "أرشفة"}
      </button>
      {error && <p role="alert" className="mt-1 max-w-40 text-[10px] text-red-700">{error}</p>}
    </div>
  );
}
