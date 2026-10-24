"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminApiError } from "@/components/admin/api-error";

export function BannerLinkEditor({ id, initialValue }: { id: string; initialValue: string | null }) {
  const router = useRouter();
  const [linkUrl, setLinkUrl] = useState(initialValue ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string }>();

  async function save(value: string | null) {
    setPending(true);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/admin/v1/banners/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ linkUrl: value }),
      });
      if (!response.ok) throw new Error(await getAdminApiError(response, "تعذر حفظ رابط اللافتة."));
      setLinkUrl(value ?? "");
      setMessage({ kind: "success", text: value ? "تم حفظ الرابط." : "تم حذف الرابط." });
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "تعذر حفظ رابط اللافتة." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save(linkUrl.trim() || null);
      }}
      className="min-w-56 space-y-2"
    >
      <label htmlFor={`banner-link-${id}`} className="sr-only">رابط اللافتة</label>
      <input
        id={`banner-link-${id}`}
        type="text"
        inputMode="url"
        maxLength={500}
        value={linkUrl}
        onChange={(event) => setLinkUrl(event.target.value)}
        dir="ltr"
        className="min-h-9 w-full rounded-lg border border-neutral-300 px-2 text-xs"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-neutral-900 px-3 py-2 text-xs text-white disabled:opacity-50">
          {pending ? "جارٍ الحفظ…" : "حفظ الرابط"}
        </button>
        {linkUrl && (
          <button type="button" disabled={pending} onClick={() => void save(null)} className="rounded-md border border-neutral-300 px-3 py-2 text-xs disabled:opacity-50">
            حذف الرابط
          </button>
        )}
      </div>
      {message && <p role={message.kind === "error" ? "alert" : "status"} className={`text-[11px] ${message.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>{message.text}</p>}
    </form>
  );
}
