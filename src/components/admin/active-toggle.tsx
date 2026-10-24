"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminApiError } from "@/components/admin/api-error";

export function ActiveToggle({
  endpoint,
  active,
  field = "isActive",
}: {
  endpoint: string;
  active: boolean;
  field?: "isActive" | "isPublished";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function toggle() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: !active }),
      });
      if (!response.ok) throw new Error(await getAdminApiError(response, "تعذر تغيير الحالة."));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تغيير الحالة.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={toggle} disabled={pending} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50">
        {pending ? "جارٍ الحفظ…" : active ? "إيقاف" : "تفعيل"}
      </button>
      {error && <p role="alert" className="mt-1 max-w-40 text-[10px] text-red-700">{error}</p>}
    </div>
  );
}
