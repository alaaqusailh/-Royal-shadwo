"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { isPurchasableCartLine, useStoreCart } from "@/components/storefront/cart-provider";
import { getCopy } from "@/lib/storefront/copy";
import { formatPrice } from "@/lib/storefront/format";
import type { StorefrontLocale } from "@/lib/utils";

export function CartView({
  locale,
  shippingFee,
  freeShippingThreshold,
}: {
  locale: StorefrontLocale;
  shippingFee: number;
  freeShippingThreshold: number;
}) {
  const copy = getCopy(locale);
  const { cart, hydrated, cartError, updateQuantity, removeFromCart } = useStoreCart();
  const purchasableItems = cart.filter(isPurchasableCartLine);
  const unavailableItems = cart.filter((item) => !isPurchasableCartLine(item));
  const subtotalCents = purchasableItems.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
  const discountedSubtotalCents = subtotalCents;
  const subtotal = subtotalCents / 100;
  const shipping = discountedSubtotalCents >= Math.round(freeShippingThreshold * 100) || subtotal === 0 ? 0 : shippingFee;
  const total = discountedSubtotalCents / 100 + shipping;

  if (!hydrated) {
    return <div aria-busy="true" className="h-72 animate-pulse bg-[#eee8de]" />;
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-[600px] flex-col items-center justify-center px-5 text-center">
        <p className="eyebrow">{copy.cart.title}</p>
        <h1 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{copy.cart.empty}</h1>
        <Link href={`/${locale}/products`} className="mt-7 inline-flex min-h-12 items-center bg-[#0d0d0d] px-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#3b3429]">{copy.cart.discover}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
      <p className="eyebrow">{copy.cart.title}</p>
      <h1 className="mt-3 font-display text-4xl font-medium sm:text-6xl">{copy.cart.title}</h1>
      {cartError && <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-xs text-red-800">{cartError}</p>}
      <div className="mt-9 grid gap-9 lg:grid-cols-[1.45fr_.75fr] lg:gap-14">
        <section aria-label={copy.cart.title} className="divide-y divide-[#e5ded2] border-y border-[#e5ded2]">
          {cart.map((item) => (
            <article key={item.id} className="flex gap-4 py-5 sm:gap-6">
              <Link href={`/${locale}/products/${item.slug}`} className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden bg-[#e5ded3] sm:w-32">
                {item.imageUrl ? <Image src={item.imageUrl} alt={locale === "ar" ? item.nameAr : item.name} fill sizes="128px" className="object-cover" /> : <span className="absolute inset-0 bg-gradient-to-br from-[#eee8de] to-[#d8cdbd]" aria-hidden="true" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <Link href={`/${locale}/products/${item.slug}`} className="font-medium hover:text-[#907347]">{locale === "ar" ? item.nameAr : item.name}</Link>
                  <p className="mt-2 text-xs text-[#786f64]">
                    {item.size && <>{copy.cart.size}: {item.size} · </>}
                    {item.color && <>{copy.cart.color}: {locale === "ar" ? item.colorAr : item.color}</>}
                  </p>
                  {!item.available && <p role="alert" className="mt-2 text-xs text-red-700">{copy.cart.unavailableItemMessage}</p>}
                  <button type="button" onClick={() => void removeFromCart(item.id)} className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-[#82796e] transition hover:text-red-700">
                    <Trash2 size={12} /> {copy.cart.remove}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-5 sm:flex-col sm:items-end">
                  <div className="flex h-9 items-center border border-[#ded6ca]">
                    <button type="button" aria-label={locale === "ar" ? "تقليل الكمية" : "Decrease quantity"} disabled={!item.available || item.quantity <= 1} onClick={() => void updateQuantity(item.id, item.quantity - 1)} className="grid h-8 w-8 place-items-center text-[#766d62] disabled:opacity-30"><Minus size={13} /></button>
                    <span className="min-w-7 text-center text-xs">{item.quantity}</span>
                    <button type="button" aria-label={locale === "ar" ? "زيادة الكمية" : "Increase quantity"} disabled={!item.available || item.quantity >= 10} onClick={() => void updateQuantity(item.id, item.quantity + 1)} className="grid h-8 w-8 place-items-center text-[#766d62] disabled:opacity-30"><Plus size={13} /></button>
                  </div>
                  <p className="text-sm font-medium">{formatPrice(item.price * item.quantity, locale)}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <aside className="h-fit bg-white p-5 sm:p-7">
          <h2 className="font-display text-2xl font-medium">{copy.cart.summary}</h2>
          <div className="mt-6 space-y-4 text-xs">
            <div className="flex justify-between"><span className="text-[#786f64]">{copy.cart.subtotal}</span><span>{formatPrice(subtotal, locale)}</span></div>
            <div className="flex justify-between"><span className="text-[#786f64]">{copy.cart.shipping}</span><span>{shipping === 0 ? copy.cart.complimentary : formatPrice(shipping, locale)}</span></div>
            <div className="border-t border-[#e8e2d8] pt-4 text-[10px] text-[#81786c]">{copy.cart.vat}</div>
            <div className="flex justify-between border-t border-[#e8e2d8] pt-4 text-sm font-semibold"><span>{copy.cart.total}</span><span>{formatPrice(total, locale)}</span></div>
          </div>
          {unavailableItems.length > 0 ? (
            <div className="mt-6 space-y-2">
              <button type="button" disabled className="flex min-h-12 w-full cursor-not-allowed items-center justify-center bg-[#8b877f] px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">{copy.cart.checkout}</button>
              <p className="text-xs leading-5 text-red-700">{copy.cart.unavailableItem}</p>
            </div>
          ) : (
            <Link href={`/${locale}/checkout`} className="mt-6 flex min-h-12 items-center justify-center bg-[#0d0d0d] px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#3b3429]">{copy.cart.checkout}</Link>
          )}
          <p className="mt-4 text-center text-[9px] tracking-[0.08em] text-[#8b8277]">{copy.cart.secure}</p>
        </aside>
      </div>
    </div>
  );
}
