"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { updateProduct, type UpdateProductState } from "@/app/admin/(dashboard)/products/[id]/edit/actions";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { cleanupUploadedImages } from "@/components/admin/cleanup-uploaded-images";

type ProductForEdit = {
  id: string;
  name: string;
  slug: string;
  nameAr: string | null;
  description: string;
  descriptionAr: string | null;
  fabric: string | null;
  categoryId: string;
  basePrice: string;
  compareAtPrice: string;
  isFeatured: boolean;
  images: Array<{ url: string; altText: string | null }>;
};

type CategoryOption = { id: string; name: string; nameAr: string | null };

export function ProductEditForm({
  product,
  categories,
}: {
  product: ProductForEdit;
  categories: CategoryOption[];
}) {
  const [state, formAction, pending] = useActionState<UpdateProductState, FormData>(updateProduct, {});
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);
  const submittedUploads = useRef<string[]>([]);
  const [cleanupError, setCleanupError] = useState(false);
  const images = Array.from({ length: 8 }, (_, index) => product.images[index] ?? { url: "", altText: "" });

  useEffect(() => {
    if (pending || !submitted.current) return;
    submitted.current = false;
    if (state.error || state.success) {
      void cleanupUploadedImages(submittedUploads.current).then((cleaned) => setCleanupError(!cleaned));
    }
  }, [pending, state.error, state.success]);

  return (
    <form ref={formRef} action={formAction} onSubmit={(event) => {
      if (event.currentTarget.querySelector('[data-image-uploading="true"]')) {
        event.preventDefault();
        return;
      }
      submitted.current = true;
      submittedUploads.current = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[name="uploadedImagePath"]')).map((input) => input.value);
      setCleanupError(false);
    }} className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <input type="hidden" name="productId" value={product.id} />
      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-lg font-semibold">تفاصيل المنتج</h3>
        <Field name="name" label="اسم المنتج" required defaultValue={product.name} />
        <Field name="slug" label="رابط المنتج" dir="ltr" required maxLength={100} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={product.slug} />
        <p className="-mt-3 text-xs leading-5 text-neutral-500">المسار الحالي: ‎/[locale]/products/{product.slug}‎. تغيير المعرّف يغيّر رابط صفحة المنتج.</p>
        <Field name="nameAr" label="اسم المنتج بالعربية" dir="rtl" defaultValue={product.nameAr ?? ""} />
        <Field name="fabric" label="نوع القماش" defaultValue={product.fabric ?? ""} />
        <label className="block text-sm font-medium">
          التصنيف
          <select name="categoryId" required defaultValue={product.categoryId} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm">
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.nameAr ? ` · ${category.nameAr}` : ""}</option>)}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="isFeatured" defaultChecked={product.isFeatured} className="h-4 w-4 accent-neutral-900" />
          إبراز هذا المنتج
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-lg font-semibold">التسعير</h3>
        <Field name="basePrice" label="السعر الأساسي (ريال سعودي)" type="number" min="0.01" step="0.01" required defaultValue={product.basePrice} />
        <Field name="compareAtPrice" label="السعر قبل الخصم (اختياري)" type="number" min="0.01" step="0.01" defaultValue={product.compareAtPrice} />
        <p className="text-xs leading-5 text-neutral-500">حفظ السعر الأساسي يحدّث أسعار جميع الخيارات ضمن معاملة واحدة. يُدار المخزون من صفحة المخزون.</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 lg:col-span-2">
        <h3 className="text-lg font-semibold">الأوصاف وصور المنتج</h3>
        <TextArea name="description" label="الوصف" required rows={4} defaultValue={product.description} />
        <TextArea name="descriptionAr" label="الوصف بالعربية" dir="rtl" rows={4} defaultValue={product.descriptionAr ?? ""} />
        <p className="text-xs text-neutral-500">ارفع صور JPG أو PNG أو WebP من جهازك. يجب الإبقاء على صورة واحدة على الأقل.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {images.map((image, index) => (
            <fieldset key={index} className="grid gap-2 rounded-xl border border-neutral-200 p-3">
              <legend className="px-1 text-xs font-medium text-neutral-600">الصورة {index + 1}</legend>
              <ImageUploadField id={`imageUrl-${index}`} name="imageUrl" label="الصورة" initialValue={image.url} alt={image.altText ?? product.name} />
              <Field id={`imageAlt-${index}`} name="imageAlt" label="النص البديل" defaultValue={image.altText ?? ""} maxLength={200} />
            </fieldset>
          ))}
        </div>
      </section>

      {state.error && (
        <p role="alert" className="text-sm text-red-700 lg:col-span-2">
          {state.error === "validation" ? "راجع الحقول، وتأكد من صحة رابط المنتج وعدم استخدامه لمنتج آخر، وأضف مسار صورة صالحًا وتأكد من صحة السعر." :
            state.error === "not_found" ? "تعذر العثور على المنتج أو التصنيف. أعد تحميل الصفحة." :
              "تعذر حفظ المنتج. حاول مرة أخرى أو تواصل مع مسؤول النظام."}
        </p>
      )}
      {state.success && <p role="status" className="text-sm text-green-700 lg:col-span-2">تم حفظ تفاصيل المنتج وصوره.</p>}
      {state.cleanupWarning && <p role="status" className="text-sm text-amber-800 lg:col-span-2">تم حفظ المنتج، لكن تعذر حذف صورة قديمة غير مستخدمة.</p>}
      {cleanupError && <p role="alert" className="text-sm text-amber-800 lg:col-span-2">تعذر تنظيف بعض الصور غير المرتبطة؛ أعد المحاولة أو تواصل مع مسؤول النظام.</p>}
      <div className="flex flex-wrap gap-3 lg:col-span-2">
        <button type="submit" disabled={pending || categories.length === 0} className="min-h-11 rounded-xl bg-neutral-900 px-5 text-sm font-medium text-white disabled:opacity-50">
          {pending ? "جارٍ الحفظ…" : "حفظ المنتج"}
        </button>
        <Link href="/admin/products" className="inline-flex min-h-11 items-center rounded-xl border border-neutral-300 px-5 text-sm">إلغاء</Link>
      </div>
    </form>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = props.id ?? props.name;
  return (
    <label htmlFor={id} className="block text-sm font-medium">
      {label}
      <Input id={id} className="mt-2 rounded-xl border-neutral-300 bg-white shadow-none" {...props} />
    </label>
  );
}

function TextArea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const id = props.id ?? props.name;
  return (
    <label htmlFor={id} className="block text-sm font-medium">
      {label}
      <textarea id={id} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-none outline-none focus:border-[#987849]" {...props} />
    </label>
  );
}
