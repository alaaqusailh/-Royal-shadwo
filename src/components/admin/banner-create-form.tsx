"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminApiError } from "@/components/admin/api-error";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { cleanupUploadedImages } from "@/components/admin/cleanup-uploaded-images";

export function BannerCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string }>();
  const [formVersion, setFormVersion] = useState(0);

  async function submit(formData: FormData) {
    if (formRef.current?.querySelector('[data-image-uploading="true"]')) {
      setMessage({ kind: "error", text: "انتظر حتى يكتمل رفع الصور قبل حفظ اللافتة." });
      return;
    }
    setPending(true);
    setMessage(undefined);
    try {
      const payload = {
        title: String(formData.get("title") ?? ""),
        titleAr: String(formData.get("titleAr") ?? ""),
        subtitle: String(formData.get("subtitle") ?? ""),
        subtitleAr: String(formData.get("subtitleAr") ?? ""),
        imageUrl: String(formData.get("imageUrl") ?? ""),
        ...(formData.get("mobileImageUrl") ? { mobileImageUrl: String(formData.get("mobileImageUrl")) } : {}),
        altText: String(formData.get("altText") ?? ""),
        ...(formData.get("linkUrl") ? { linkUrl: String(formData.get("linkUrl")) } : {}),
        sortOrder: Number(formData.get("sortOrder") ?? 0),
        ...(formData.get("startsAt") ? { startsAt: new Date(String(formData.get("startsAt"))).toISOString() } : {}),
        ...(formData.get("endsAt") ? { endsAt: new Date(String(formData.get("endsAt"))).toISOString() } : {}),
        isActive: formData.get("isActive") === "on",
      };
      const response = await fetch("/api/admin/v1/banners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await getAdminApiError(response, "تعذر حفظ اللافتة."));
      setMessage({ kind: "success", text: "تم إنشاء اللافتة." });
      formRef.current?.reset();
      setFormVersion((version) => version + 1);
      router.refresh();
    } catch (error) {
      const cleaned = await cleanupUploadedImages(formData.getAll("uploadedImagePath").filter((path): path is string => typeof path === "string"));
      setMessage({ kind: "error", text: `${error instanceof Error ? error.message : "تعذر حفظ اللافتة."}${cleaned ? "" : " تعذر حذف بعض الصور غير المرتبطة؛ أعد المحاولة أو تواصل مع مسؤول النظام."}` });
    } finally {
      setPending(false);
    }
  }

  return (
    <form key={formVersion} ref={formRef} action={submit} className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-3">
      <label className="text-xs font-medium text-neutral-600">العنوان
        <input name="title" required minLength={2} maxLength={191} className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">العنوان بالعربية
        <input name="titleAr" maxLength={191} lang="ar" dir="rtl" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <ImageUploadField id="banner-image" name="imageUrl" label="صورة اللافتة" required />
      <ImageUploadField id="banner-mobile-image" name="mobileImageUrl" label="صورة الجوال (اختياري)" />
      <label className="text-xs font-medium text-neutral-600">رابط الوجهة (اختياري)
        <input name="linkUrl" maxLength={500} inputMode="url" dir="ltr" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">ترتيب العرض
        <input name="sortOrder" type="number" min="0" max="100000" defaultValue="0" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">يبدأ في (اختياري)
        <input name="startsAt" type="datetime-local" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">ينتهي في (اختياري)
        <input name="endsAt" type="datetime-local" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">العنوان الفرعي
        <input name="subtitle" maxLength={2000} className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">العنوان الفرعي بالعربية
        <input name="subtitleAr" maxLength={2000} lang="ar" dir="rtl" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">النص البديل للصورة
        <input name="altText" maxLength={191} className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="flex min-h-10 items-center gap-2 text-sm text-neutral-700">
        <input name="isActive" type="checkbox" defaultChecked className="accent-[#9a7c49]" /> نشر الآن
      </label>
      {message && <p role={message.kind === "error" ? "alert" : "status"} className={`text-xs md:col-span-2 xl:col-span-3 ${message.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>{message.text}</p>}
      <button disabled={pending} className="min-h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50 md:col-span-2 xl:col-span-3 xl:justify-self-start">
        {pending ? "جارٍ الحفظ…" : "إنشاء لافتة"}
      </button>
    </form>
  );
}
