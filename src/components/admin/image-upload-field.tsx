"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { cleanupUploadedImages } from "@/components/admin/cleanup-uploaded-images";
import { isVercelBlobImageUrl } from "@/lib/storage/image-path";

type UploadResponse = { data?: { path?: string }; error?: { code?: string } };

const acceptedImages = "image/jpeg,image/png,image/webp";

export function ImageUploadField({
  name,
  id,
  label,
  initialValue = "",
  required = false,
  alt = "",
}: {
  name: string;
  id: string;
  label: string;
  initialValue?: string;
  required?: boolean;
  alt?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [preview, setPreview] = useState(initialValue);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const uploadedPathsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      void cleanupUploadedImages(uploadedPathsRef.current).then((cleaned) => {
        if (!cleaned) console.error("Some unused uploaded images could not be cleaned up.");
      });
    };
  }, []);

  async function upload(file: File) {
    setError("");
    setPreviewError(false);
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/v1/uploads", { method: "POST", body });
      const result = await response.json() as UploadResponse;
      if (!response.ok || !result.data?.path) {
        const code = result.error?.code;
        const message = code === "IMAGE_TOO_LARGE" ? "حجم الصورة أكبر من الحد المسموح." :
          code === "UNSUPPORTED_IMAGE" ? "الصيغ المقبولة هي JPG وPNG وWebP." :
            code === "UNAUTHENTICATED" || code === "FORBIDDEN" ? "انتهت الجلسة أو لا تملك صلاحية رفع الصور." :
              "تعذر رفع الصورة. حاول مرة أخرى.";
        throw new Error(message);
      }
      setValue(result.data.path);
      setPreview(result.data.path);
      setUploadedPaths((paths) => [...paths, result.data!.path!]);
      uploadedPathsRef.current = [...uploadedPathsRef.current, result.data.path];
    } catch (uploadError) {
      setPreview(value);
      setError(uploadError instanceof Error ? uploadError.message : "تعذر رفع الصورة. حاول مرة أخرى.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (file) void upload(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (uploading) return;
    const file = event.dataTransfer.files[0];
    if (file) void upload(file);
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium">{label}{required && <span aria-hidden="true"> *</span>}</span>
      <input type="hidden" name={name} value={value} />
      {uploadedPaths.map((path, index) => <input key={`${path}-${index}`} type="hidden" name="uploadedImagePath" value={path} />)}
      <div
        aria-required={required}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-xl border border-dashed p-3 transition ${dragging ? "border-[#987849] bg-[#f7f2e9]" : "border-neutral-300 bg-neutral-50"}`}
      >
        {preview ? (
          <div className="flex items-center gap-3">
            {previewError ?
              <div role="alert" className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-neutral-100 p-2 text-center text-xs text-red-700">تعذر تحميل الصورة</div> :
              preview.startsWith("/") || isVercelBlobImageUrl(preview) ?
                <Image src={preview} alt={alt || label} width={112} height={112} unoptimized onError={() => setPreviewError(true)} className="h-24 w-24 rounded-lg bg-white object-cover" /> :
              <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-neutral-100 p-2 text-center text-xs text-neutral-500">صورة قديمة من مصدر خارجي</div>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-neutral-600" dir="ltr">{value || "معاينة الصورة"}</p>
              {uploading && <p role="status" className="mt-1 text-xs text-neutral-500">جارٍ رفع الصورة…</p>}
              <button type="button" disabled={uploading} onClick={() => {
                const removedPath = value;
                setValue("");
                setPreview("");
                setError("");
                setPreviewError(false);
                void cleanupUploadedImages([removedPath]).then((cleaned) => {
                  if (!cleaned) setError("تعذر تنظيف صورة غير مستخدمة.");
                });
              }} className="mt-2 min-h-9 rounded-lg border border-neutral-300 bg-white px-3 text-xs disabled:opacity-50">
                إزالة الصورة
              </button>
              {initialValue && value !== initialValue && (
                <button type="button" disabled={uploading} onClick={() => {
                  const replacedPath = value;
                  setValue(initialValue);
                  setPreview(initialValue);
                  setError("");
                  setPreviewError(false);
                  void cleanupUploadedImages([replacedPath]).then((cleaned) => {
                    if (!cleaned) setError("تعذر تنظيف صورة غير مستخدمة.");
                  });
                }} className="ms-2 mt-2 min-h-9 rounded-lg border border-neutral-300 bg-white px-3 text-xs disabled:opacity-50">
                  استعادة الصورة الأصلية
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="flex min-h-24 w-full flex-col items-center justify-center gap-1 text-center text-xs text-neutral-600 disabled:opacity-50">
              <span className="font-medium">اختر صورة من جهازك أو اسحبها هنا</span>
              <span>JPEG أو PNG أو WebP</span>
            </button>
            {uploading && <p role="status" className="text-center text-xs text-neutral-500">جارٍ رفع الصورة…</p>}
          </>
        )}
        <input ref={inputRef} id={id} type="file" accept={acceptedImages} onChange={onChange} disabled={uploading} className="sr-only" aria-label={`اختر ${label}`} />
        <input type="hidden" data-image-uploading={uploading ? "true" : "false"} />
        {preview && (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="mt-3 min-h-9 rounded-lg border border-neutral-300 bg-white px-3 text-xs disabled:opacity-50">
            استبدال الصورة
          </button>
        )}
      </div>
      {required && <span className="sr-only" aria-hidden="true">{value ? "تم اختيار الصورة" : "الصورة مطلوبة"}</span>}
      {required && !value && !uploading && <p className="text-xs text-neutral-500">يرجى رفع صورة قبل الحفظ.</p>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
