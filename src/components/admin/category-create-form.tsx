"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminApiError } from "@/components/admin/api-error";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { cleanupUploadedImages } from "@/components/admin/cleanup-uploaded-images";

type CategoryPayload = {
  name: string;
  nameAr?: string;
  slug: string;
  description?: string;
  descriptionAr?: string;
  imageUrl?: string;
};

export function CategoryCreateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string }>();
  const [formVersion, setFormVersion] = useState(0);

  async function submit(formData: FormData) {
    if (formRef.current?.querySelector('[data-image-uploading="true"]')) {
      setMessage({ kind: "error", text: "انتظر حتى يكتمل رفع الصورة قبل حفظ التصنيف." });
      return;
    }
    setPending(true);
    setMessage(undefined);
    const payload: CategoryPayload = {
      name: String(formData.get("name") ?? ""),
      nameAr: String(formData.get("nameAr") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      description: String(formData.get("description") ?? ""),
      descriptionAr: String(formData.get("descriptionAr") ?? ""),
      ...(formData.get("imageUrl") ? { imageUrl: String(formData.get("imageUrl")) } : {}),
    };

    try {
      const response = await fetch("/api/admin/v1/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await getAdminApiError(response, "تعذر حفظ التصنيف."));
      }
      setMessage({ kind: "success", text: "تم إنشاء التصنيف وحفظه." });
      formRef.current?.reset();
      setFormVersion((version) => version + 1);
      router.refresh();
    } catch (error) {
      const cleaned = await cleanupUploadedImages(formData.getAll("uploadedImagePath").filter((path): path is string => typeof path === "string"));
      setMessage({ kind: "error", text: `${error instanceof Error ? error.message : "تعذر حفظ التصنيف."}${cleaned ? "" : " تعذر حذف بعض الصور غير المرتبطة؛ أعد المحاولة أو تواصل مع مسؤول النظام."}` });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      key={formVersion}
      action={submit}
      className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-5 sm:grid-cols-2 xl:grid-cols-5"
    >
      <label className="text-xs font-medium text-neutral-600">الاسم
        <input name="name" required minLength={2} maxLength={160} className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">الاسم بالعربية
        <input name="nameAr" maxLength={160} lang="ar" dir="rtl" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">الرابط المختصر
        <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={100} dir="ltr" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">الوصف
        <input name="description" maxLength={191} className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <label className="text-xs font-medium text-neutral-600">الوصف بالعربية
        <input name="descriptionAr" maxLength={2000} lang="ar" dir="rtl" className="mt-1.5 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
      </label>
      <ImageUploadField id="category-image" name="imageUrl" label="صورة التصنيف (اختياري)" />
      {message && <p role={message.kind === "error" ? "alert" : "status"} className={`text-xs sm:col-span-2 xl:col-span-5 ${message.kind === "error" ? "text-red-700" : "text-emerald-700"}`}>{message.text}</p>}
      <button disabled={pending} className="min-h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50 sm:col-span-2 xl:col-span-5 xl:justify-self-start">
        {pending ? "جارٍ الحفظ…" : "إضافة تصنيف"}
      </button>
    </form>
  );
}
