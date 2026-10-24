"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminApiError } from "@/components/admin/api-error";

type Option = { id: string; name: string; nameAr: string | null };

export function HomeSectionCreateForm({
  categories,
  products,
}: {
  categories: Option[];
  products: Array<{ id: string; name: string; nameAr: string | null }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string }>();

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(undefined);
    try {
      const linkUrl = String(formData.get("linkUrl") ?? "").trim();
      const categoryId = String(formData.get("categoryId") ?? "");
      const payload = {
        key: String(formData.get("key") ?? ""),
        type: String(formData.get("type") ?? "PRODUCTS"),
        title: String(formData.get("title") ?? ""),
        titleAr: String(formData.get("titleAr") ?? ""),
        subtitle: String(formData.get("subtitle") ?? ""),
        subtitleAr: String(formData.get("subtitleAr") ?? ""),
        ...(linkUrl ? { linkUrl } : {}),
        ...(categoryId ? { categoryId } : {}),
        productIds: formData.getAll("productIds").map(String),
        sortOrder: Number(formData.get("sortOrder") ?? 0),
        isActive: formData.get("isActive") === "on",
      };
      const response = await fetch("/api/admin/v1/home-sections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await getAdminApiError(response, "تعذر إنشاء القسم."));
      setMessage({ kind: "success", text: "تم إنشاء قسم الصفحة الرئيسية." });
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "تعذر إنشاء القسم." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-3">
      <label className="text-xs font-medium text-neutral-600">المعرّف الداخلي
        <input name="key" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={100} dir="ltr" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">نوع القسم
        <select name="type" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm">
          <option value="PRODUCTS">منتجات</option>
          <option value="CATEGORIES">تصنيف</option>
          <option value="BANNER">محتوى نصي</option>
          <option value="PROMOTION">عرض ترويجي</option>
        </select>
      </label>
      <label className="text-xs font-medium text-neutral-600">العنوان
        <input name="title" required minLength={2} maxLength={191} className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">العنوان بالعربية
        <input name="titleAr" maxLength={191} lang="ar" dir="rtl" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">العنوان الفرعي
        <input name="subtitle" maxLength={191} className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">العنوان الفرعي بالعربية
        <input name="subtitleAr" maxLength={191} lang="ar" dir="rtl" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">رابط القسم (اختياري)
        <input name="linkUrl" maxLength={500} inputMode="url" dir="ltr" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">التصنيف (اختياري)
        <select name="categoryId" defaultValue="" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm">
          <option value="">بدون تصنيف</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.nameAr ?? category.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-medium text-neutral-600">المنتجات (اختياري)
        <select name="productIds" multiple size={4} className="mt-1.5 min-h-24 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm">
          {products.map((product) => <option key={product.id} value={product.id}>{product.nameAr ?? product.name}</option>)}
        </select>
      </label>
      <label className="text-xs font-medium text-neutral-600">ترتيب العرض
        <input name="sortOrder" type="number" min="0" max="100000" defaultValue="0" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="flex min-h-10 items-center gap-2 text-sm text-neutral-700">
        <input name="isActive" type="checkbox" defaultChecked className="accent-[#9a7c49]" /> نشر الآن
      </label>
      {message && <p role={message.kind === "error" ? "alert" : "status"} className={`text-xs md:col-span-2 xl:col-span-3 ${message.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>{message.text}</p>}
      <button disabled={pending} className="min-h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50 md:col-span-2 xl:col-span-3 xl:justify-self-start">
        {pending ? "جارٍ الإنشاء…" : "إنشاء القسم"}
      </button>
    </form>
  );
}
