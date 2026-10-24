"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminApiError } from "@/components/admin/api-error";

const types = [
  ["PERCENTAGE", "نسبة مئوية"],
  ["FIXED_AMOUNT", "مبلغ ثابت"],
  ["BUY_X_GET_Y", "اشترِ X واحصل على Y"],
  ["FREE_SHIPPING", "شحن مجاني"],
] as const;

export function PromotionCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string }>();

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(undefined);
    try {
      const type = String(formData.get("type") ?? "");
      const payload = {
        name: String(formData.get("name") ?? ""),
        nameAr: String(formData.get("nameAr") ?? ""),
        description: String(formData.get("description") ?? ""),
        type,
        value: String(formData.get("value") ?? "0"),
        ...(type === "BUY_X_GET_Y" ? {
          buyQuantity: Number(formData.get("buyQuantity")),
          getQuantity: Number(formData.get("getQuantity")),
        } : {}),
        ...(formData.get("startsAt") ? { startsAt: new Date(String(formData.get("startsAt"))).toISOString() } : {}),
        ...(formData.get("endsAt") ? { endsAt: new Date(String(formData.get("endsAt"))).toISOString() } : {}),
        ...(formData.get("maxRedemptions") ? { maxRedemptions: Number(formData.get("maxRedemptions")) } : {}),
        isActive: formData.get("isActive") === "on",
      };
      const response = await fetch("/api/admin/v1/promotions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await getAdminApiError(response, "تعذر حفظ العرض."));
      setMessage({ kind: "success", text: "تم إنشاء العرض الترويجي." });
      formRef.current?.reset();
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "تعذر حفظ العرض." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={submit} className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-medium text-neutral-600">اسم العرض
        <input name="name" required minLength={2} maxLength={191} className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">الاسم بالعربية
        <input name="nameAr" maxLength={191} lang="ar" dir="rtl" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">نوع العرض
        <select name="type" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm">
          {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="text-xs font-medium text-neutral-600">القيمة (ريال أو نسبة مئوية)
        <input name="value" type="number" min="0" max="1000000" step="0.01" defaultValue="0" required className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">كمية الشراء (اشترِ X واحصل على Y)
        <input name="buyQuantity" type="number" min="1" max="100" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">كمية المنتجات المجانية
        <input name="getQuantity" type="number" min="1" max="100" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">تاريخ البدء
        <input name="startsAt" type="datetime-local" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">تاريخ الانتهاء
        <input name="endsAt" type="datetime-local" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600 md:col-span-2 xl:col-span-3">الوصف
        <input name="description" maxLength={2000} className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">الحد الأقصى للاستخدام
        <input name="maxRedemptions" type="number" min="1" max="1000000" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="flex min-h-10 items-center gap-2 text-sm text-neutral-700">
        <input name="isActive" type="checkbox" defaultChecked className="accent-[#9a7c49]" /> تفعيل فورًا
      </label>
      {message && <p role={message.kind === "error" ? "alert" : "status"} className={`text-xs md:col-span-2 xl:col-span-4 ${message.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>{message.text}</p>}
      <button disabled={pending} className="min-h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50 md:col-span-2 xl:col-span-4 xl:justify-self-start">
        {pending ? "جارٍ الحفظ…" : "إنشاء عرض"}
      </button>
    </form>
  );
}
