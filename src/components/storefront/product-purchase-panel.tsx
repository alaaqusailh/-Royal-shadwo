"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Ruler, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoreCart } from "@/components/storefront/cart-provider";
import { getCopy } from "@/lib/storefront/copy";
import { formatPrice } from "@/lib/storefront/format";
import type { StorefrontLocale } from "@/lib/utils";

export type ProductVariantOption = {
  id: string;
  size: string;
  color: string;
  colorAr: string;
  colorCode: string;
  colorHex: string;
  price: number;
  stock: number;
};

export function ProductPurchasePanel({
  locale,
  product,
  variants,
  freeShippingThreshold,
}: {
  locale: StorefrontLocale;
  product: {
    price: number;
    compareAtPrice: number | null;
    requiresSize: boolean;
  };
  variants: ProductVariantOption[];
  freeShippingThreshold: number;
}) {
  const copy = getCopy(locale);
  const { addToCart, cartError } = useStoreCart();
  const availableVariants = variants.filter((variant) => variant.stock > 0);
  const firstAvailable = availableVariants[0] ?? variants[0];
  const [selectedColor, setSelectedColor] = useState(firstAvailable?.colorCode ?? "");
  const [selectedSize, setSelectedSize] = useState(product.requiresSize ? "" : firstAvailable?.size ?? "");
  const [added, setAdded] = useState(false);
  const [selectionError, setSelectionError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const sizeGuideRef = useRef<HTMLDialogElement>(null);
  const colors = Array.from(new Map(variants.map((variant) => [variant.colorCode, variant])).values());
  const sizes = variants.filter((variant) => variant.colorCode === selectedColor);
  const selectedVariant = variants.find(
    (variant) => variant.colorCode === selectedColor && variant.size === selectedSize,
  );
  const sizeGuideSizes = Array.from(new Set(variants.map((variant) => variant.size)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  useEffect(() => {
    const dialog = sizeGuideRef.current;
    if (!dialog) return;

    if (sizeGuideOpen && !dialog.open) dialog.showModal();
    if (!sizeGuideOpen && dialog.open) dialog.close();
  }, [sizeGuideOpen]);

  function selectColor(colorCode: string) {
    setSelectedColor(colorCode);
    const nextVariant = variants.find((variant) => variant.colorCode === colorCode && variant.stock > 0)
      ?? variants.find((variant) => variant.colorCode === colorCode);
    setSelectedSize(product.requiresSize ? "" : nextVariant?.size ?? "");
    setAdded(false);
    setSelectionError(false);
  }

  async function handleAdd() {
    if (!selectedVariant) {
      setSelectionError(true);
      return;
    }
    if (selectedVariant.stock < 1) return;

    setIsAdding(true);
    try {
      const addedToCart = await addToCart(selectedVariant.id);
      setAdded(addedToCart);
      setSelectionError(false);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-2xl font-medium tracking-wide text-[#1a1a1a]">{formatPrice(selectedVariant?.price ?? product.price, locale)}</p>
          {product.compareAtPrice !== null && product.compareAtPrice > product.price && (
            <>
              <span className="text-sm text-[#847a6d] line-through">{formatPrice(product.compareAtPrice, locale)}</span>
              <span className="bg-[#9b3d31] px-2 py-1 text-[9px] font-semibold text-white">
                -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
              </span>
            </>
          )}
        </div>
        <span className="text-[9px] uppercase tracking-[0.16em] text-[#847a6d]">{copy.cart.vat}</span>
      </div>

      {colors.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-xs font-semibold">{copy.product.color}: <span className="font-normal text-[#746b60]">{locale === "ar" ? colors.find((color) => color.colorCode === selectedColor)?.colorAr : colors.find((color) => color.colorCode === selectedColor)?.color}</span></legend>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => (
              <button
                key={color.colorCode}
                type="button"
                onClick={() => selectColor(color.colorCode)}
                aria-label={locale === "ar" ? color.colorAr : color.color}
                aria-pressed={selectedColor === color.colorCode}
                className={`grid h-9 w-9 place-items-center rounded-full border p-1 ${selectedColor === color.colorCode ? "border-[#c8a96c]" : "border-transparent"}`}
              >
                <span className="h-full w-full rounded-full border border-black/10" style={{ backgroundColor: color.colorHex }} />
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <div className="mb-3 flex items-center justify-between gap-3">
          <legend className="text-xs font-semibold">{copy.product.size}</legend>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setSizeGuideOpen(true)}
            className="inline-flex items-center gap-1.5 text-[10px] text-[#8a7c68] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9e8457]"
          >
            <Ruler size={13} /> {copy.product.sizeGuide}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {sizes.map((variant) => {
            const isAvailable = variant.stock > 0;
            return (
              <button
                key={variant.id}
                type="button"
                disabled={!isAvailable}
                onClick={() => {
                  setSelectedSize(variant.size);
                  setAdded(false);
                  setSelectionError(false);
                }}
                aria-pressed={selectedSize === variant.size}
                className={`min-h-11 border text-xs transition ${selectedSize === variant.size ? "border-[#0d0d0d] bg-[#0d0d0d] text-white" : "border-[#d9d0c4] bg-white text-[#1a1a1a] hover:border-[#9e8457]"} disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through`}
              >
                {variant.size}
              </button>
            );
          })}
        </div>
      </fieldset>

      {selectionError && <p role="alert" className="text-xs text-red-700">{copy.product.chooseSize}</p>}
      {cartError && <p role="alert" className="text-xs text-red-700">{cartError}</p>}
      <Button type="button" onClick={handleAdd} disabled={availableVariants.length === 0 || isAdding} className="h-[3.15rem] w-full rounded-none bg-[#0d0d0d] text-[10px] uppercase tracking-[0.18em] hover:bg-[#35302a]">
        {availableVariants.length === 0 ? copy.product.outOfStock : isAdding ? copy.product.adding : added ? <><Check size={15} className="me-2" />{copy.product.added}</> : copy.product.add}
      </Button>
      <div className="border-t border-[#e4ddd2] pt-4 text-xs leading-6 text-[#71685e]">
        <p>{locale === "ar"
          ? `يتوفر التوصيل المجاني للطلبات بقيمة ${formatPrice(freeShippingThreshold, locale)} فأكثر`
          : `Complimentary delivery on orders of ${formatPrice(freeShippingThreshold, locale)} or more`}</p>
        <p>{copy.product.returns}</p>
      </div>
      <dialog
        ref={sizeGuideRef}
        aria-labelledby="size-guide-title"
        onClose={() => setSizeGuideOpen(false)}
        className="fixed inset-0 m-auto max-h-[min(90dvh,36rem)] w-[min(calc(100vw-2rem),32rem)] overflow-y-auto border-0 bg-[#faf7f2] p-6 text-[#1a1a1a] shadow-2xl backdrop:bg-black/55 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{locale === "ar" ? "اختاري المقاس المناسب" : "Find your fit"}</p>
            <h2 id="size-guide-title" className="mt-2 font-display text-2xl font-medium">
              {copy.product.sizeGuide}
            </h2>
          </div>
          <button
            type="button"
            aria-label={locale === "ar" ? "إغلاق دليل المقاسات" : "Close size guide"}
            onClick={() => sizeGuideRef.current?.close()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9e8457]"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-5 text-sm leading-7 text-[#71685e]">
          {locale === "ar"
            ? "مقاسات العباية تشير إلى طولها بالبوصة، وليست قياسات الجسم. اختاري الطول الذي يناسب قامتكِ وطول العباية المفضل لديكِ."
            : "Abaya sizes refer to the garment length in inches, not body measurements. Choose the length that best suits your height and preferred fit."}
        </p>
        <div className="mt-5 overflow-hidden border border-[#e4ddd2]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-white text-start">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {locale === "ar" ? "المقاس" : "Size"}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {locale === "ar" ? "طول العباية بالبوصة" : "Garment length (inches)"}
                </th>
              </tr>
            </thead>
            <tbody>
              {sizeGuideSizes.map((size) => (
                <tr key={size} className="border-t border-[#e4ddd2]">
                  <th scope="row" className="px-4 py-3 font-medium">{size}</th>
                  <td className="px-4 py-3">{size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </dialog>
    </div>
  );
}
