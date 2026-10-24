"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useEffect } from "react";
import { isPurchasableCartLine, useStoreCart } from "@/components/storefront/cart-provider";
import { formatPrice } from "@/lib/storefront/format";
import type { StorefrontLocale } from "@/lib/utils";

export function CartDrawer({
  locale,
  shippingFee,
  freeShippingThreshold,
  open,
  onClose,
}: {
  locale: StorefrontLocale;
  shippingFee: number;
  freeShippingThreshold: number;
  open: boolean;
  onClose: () => void;
}) {
  const { cart, hydrated, updateQuantity, removeFromCart } = useStoreCart();
  const purchasableItems = cart.filter(isPurchasableCartLine);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  const subtotalCents = purchasableItems.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
  const discountedSubtotalCents = subtotalCents;
  const shipping = discountedSubtotalCents >= Math.round(freeShippingThreshold * 100) || subtotalCents === 0 ? 0 : shippingFee;
  const direction = locale === "ar" ? "rtl" : "ltr";

  return (
    <div className="fixed inset-0 z-[60]" dir={direction}>
      <button type="button" aria-label={locale === "ar" ? "إغلاق السلة" : "Close cart"} onClick={onClose} className="absolute inset-0 h-full w-full bg-black/55" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={locale === "ar" ? "سلة التسوق" : "Shopping cart"}
        className="absolute inset-y-0 end-0 flex w-[min(100vw,27rem)] flex-col bg-[#fffdf8] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#e9e2d7] px-5 py-4">
          <h2 className="font-display text-2xl">{locale === "ar" ? "سلة التسوق" : "Your cart"}</h2>
          <button type="button" aria-label={locale === "ar" ? "إغلاق السلة" : "Close cart"} onClick={onClose} className="grid h-10 w-10 place-items-center">
            <X size={19} />
          </button>
        </div>
        {!hydrated ? (
          <div aria-busy="true" className="m-5 h-48 animate-pulse bg-[#f1ece3]" />
        ) : cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="text-sm text-[#746b60]">{locale === "ar" ? "سلتك بانتظار عبايتك المفضلة." : "Your favourite abaya is waiting."}</p>
            <Link href={`/${locale}/products`} onClick={onClose} className="mt-5 border-b border-[#c6a66a] pb-1 text-xs">
              {locale === "ar" ? "تسوقي الآن" : "Shop now"}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y divide-[#eee8df] overflow-y-auto px-5">
              {cart.map((item) => (
                <article key={item.id} className="flex gap-3 py-4">
                  <Link href={`/${locale}/products/${item.slug}`} onClick={onClose} className="relative aspect-[4/5] w-[4.5rem] shrink-0 overflow-hidden bg-[#f1ece3]">
                    {item.imageUrl ? <Image src={item.imageUrl} alt={locale === "ar" ? item.nameAr : item.name} fill sizes="72px" className="object-cover" /> : <span className="absolute inset-0 bg-gradient-to-br from-[#eee8de] to-[#d8cdbd]" aria-hidden="true" />}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/${locale}/products/${item.slug}`} onClick={onClose} className="line-clamp-2 text-xs font-medium">
                          {locale === "ar" ? item.nameAr : item.name}
                        </Link>
                        <p className="mt-1 text-[10px] text-[#81786c]">{locale === "ar" ? "المقاس" : "Size"}: {item.size ?? "—"}</p>
                        {!item.available && <p className="mt-1 text-[10px] text-red-700">{locale === "ar" ? "غير متوفر" : "Unavailable"}</p>}
                      </div>
                      <button type="button" aria-label={locale === "ar" ? "إزالة المنتج" : "Remove item"} onClick={() => void removeFromCart(item.id)} className="p-1 text-[#81786c] hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-8 items-center border border-[#ddd5ca]">
                        <button type="button" disabled={!item.available || item.quantity <= 1} aria-label={locale === "ar" ? "تقليل الكمية" : "Decrease quantity"} onClick={() => void updateQuantity(item.id, item.quantity - 1)} className="grid h-7 w-7 place-items-center disabled:opacity-40">
                          <Minus size={12} />
                        </button>
                        <span className="min-w-6 text-center text-[10px]">{item.quantity}</span>
                        <button type="button" disabled={!item.available || item.quantity >= 10} aria-label={locale === "ar" ? "زيادة الكمية" : "Increase quantity"} onClick={() => void updateQuantity(item.id, item.quantity + 1)} className="grid h-7 w-7 place-items-center disabled:opacity-40">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-xs font-medium">{formatPrice(item.price * item.quantity, locale)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="border-t border-[#e9e2d7] bg-white px-5 py-5">
              <div className="space-y-3 text-xs">
                <div className="flex justify-between"><span className="text-[#746b60]">{locale === "ar" ? "المجموع الفرعي" : "Subtotal"}</span><span>{formatPrice(subtotalCents / 100, locale)}</span></div>
                <div className="flex justify-between"><span className="text-[#746b60]">{locale === "ar" ? "التوصيل" : "Shipping"}</span><span>{shipping ? formatPrice(shipping, locale) : (locale === "ar" ? "مجاني" : "Free")}</span></div>
                <p className="border-t border-[#eee8df] pt-3 text-[10px] text-[#81786c]">{locale === "ar" ? "الأسعار شاملة ضريبة القيمة المضافة" : "Prices include VAT"}</p>
                <div className="flex justify-between border-t border-[#eee8df] pt-3 text-sm font-semibold"><span>{locale === "ar" ? "الإجمالي" : "Total"}</span><span>{formatPrice(discountedSubtotalCents / 100 + shipping, locale)}</span></div>
              </div>
              <Link href={`/${locale}/checkout`} onClick={onClose} className="mt-4 flex min-h-12 items-center justify-center bg-[#171816] px-5 text-xs font-semibold text-white transition hover:bg-[#34352f]">
                {locale === "ar" ? "إتمام الطلب" : "Checkout"}
              </Link>
              <Link href={`/${locale}/cart`} onClick={onClose} className="mt-3 flex justify-center py-1 text-[10px] text-[#746b60] underline underline-offset-4">
                {locale === "ar" ? "عرض السلة" : "View cart"}
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
