"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { createProduct, type CreateProductState } from "@/app/admin/(dashboard)/products/new/actions";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { cleanupUploadedImages } from "@/components/admin/cleanup-uploaded-images";

type Option = { id: string; label: string };

export function ProductCreateForm({
  categories,
  sizes,
  colors,
}: {
  categories: Array<Option & { labelAr: string | null }>;
  sizes: Option[];
  colors: Array<Option & { hex: string }>;
}) {
  const [state, formAction, pending] = useActionState<CreateProductState, FormData>(createProduct, {});
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);
  const submittedUploads = useRef<string[]>([]);
  const [cleanupError, setCleanupError] = useState(false);
  const inputClass = "rounded-xl border-neutral-300 bg-white shadow-none";

  useEffect(() => {
    if (pending || !submitted.current) return;
    submitted.current = false;
    if (state.error || state.slug) {
      void cleanupUploadedImages(submittedUploads.current).then((cleaned) => setCleanupError(!cleaned));
    }
  }, [pending, state.error, state.slug]);

  if (state.slug) {
    return (
      <div role="status" className="max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-semibold text-emerald-900">تم إنشاء المنتج</h2>
        <p className="mt-2 text-sm text-emerald-800">أُضيف المنتج إلى الكتالوج ونُشر مع الخيارات المحددة.</p>
        <Link href="/admin/products" className="mt-5 inline-flex rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white">العودة إلى المنتجات</Link>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={(event) => {
      if (event.currentTarget.querySelector('[data-image-uploading="true"]')) {
        event.preventDefault();
        return;
      }
      submitted.current = true;
      submittedUploads.current = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[name="uploadedImagePath"]')).map((input) => input.value);
      setCleanupError(false);
    }} className="grid max-w-4xl gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold">معلومات المنتج</h2>
        <Field name="name" label="اسم المنتج" required className={inputClass} />
        <Field name="slug" label="رابط المنتج" dir="ltr" placeholder="royal-shadow-abaya" maxLength={100} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className={inputClass} />
        <p className="-mt-3 text-xs leading-5 text-neutral-500">يُستخدم بعد ‎/[locale]/products/‎. اتركه فارغًا لتوليده تلقائيًا من اسم المنتج.</p>
        <Field name="nameAr" label="اسم المنتج بالعربية" dir="rtl" className={inputClass} />
        <Field name="fabric" label="نوع القماش" className={inputClass} />
        <label className="block text-sm font-medium">التصنيف
          <select name="categoryId" required className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm">
            {categories.map((category) => <option key={category.id} value={category.id}>{category.label}{category.labelAr ? ` · ${category.labelAr}` : ""}</option>)}
          </select>
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold">السعر والخيارات والمخزون</h2>
        <Field name="price" label="السعر (ريال سعودي)" type="number" min="0.01" step="0.01" required className={inputClass} />
        <label className="block text-sm font-medium">اللون
          <select name="colorId" required className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm">
            {colors.map((color) => <option key={color.id} value={color.id}>{color.label}</option>)}
          </select>
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">المقاسات</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size, index) => (
              <label key={size.id} className="flex min-h-10 cursor-pointer items-center gap-2 border border-neutral-200 px-3 text-sm">
                <input type="checkbox" name="sizeIds" value={size.id} defaultChecked={index === 0} className="accent-[#9a7c49]" />{size.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field name="stock" label="الكمية المتاحة مبدئيًا لكل مقاس" type="number" min="0" max="10000" step="1" defaultValue="0" required className={inputClass} />
      </section>

      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 lg:col-span-2">
        <h2 className="text-lg font-semibold">الوصف والصور</h2>
        <TextArea name="description" label="الوصف" required rows={4} />
        <TextArea name="descriptionAr" label="الوصف بالعربية" dir="rtl" rows={4} />
        <ImageUploadField id="product-image" name="imageUrl" label="صورة المنتج" required />
        <Field name="imageAlt" label="النص البديل للصورة" className={inputClass} />
      </section>

      {state.error && <p role="alert" className="text-sm text-red-700 lg:col-span-2">{state.error === "unauthorized" ? "لا تسمح صلاحيتك بإنشاء المنتجات." : state.error === "validation" ? "راجع بيانات المنتج، وتأكد أن رابط المنتج صالح وغير مستخدم لمنتج آخر." : "تعذر حفظ المنتج. تحقق من رمز المنتج ثم حاول مجددًا."}</p>}
      {cleanupError && <p role="alert" className="text-sm text-amber-800 lg:col-span-2">تعذر تنظيف بعض الصور غير المرتبطة؛ أعد المحاولة أو تواصل مع مسؤول النظام.</p>}
      <div className="flex flex-wrap gap-3 lg:col-span-2">
        <button disabled={pending || categories.length === 0 || sizes.length === 0 || colors.length === 0} className="min-h-11 rounded-xl bg-neutral-900 px-5 text-sm font-medium text-white disabled:opacity-50">{pending ? "جارٍ الإنشاء…" : "إنشاء المنتج"}</button>
        <Link href="/admin/products" className="inline-flex min-h-11 items-center rounded-xl border border-neutral-300 px-5 text-sm">إلغاء</Link>
      </div>
    </form>
  );
}

function Field({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; className: string }) {
  const id = props.id ?? props.name;
  return (
    <label htmlFor={id} className="block text-sm font-medium">{label}
      <Input id={id} className={`mt-2 ${className}`} {...props} />
    </label>
  );
}

function TextArea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const id = props.id ?? props.name;
  return (
    <label htmlFor={id} className="block text-sm font-medium">{label}
      <textarea id={id} className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-none outline-none focus:border-[#987849]" {...props} />
    </label>
  );
}
