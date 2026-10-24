"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { isPurchasableCartLine, useStoreCart } from "@/components/storefront/cart-provider";
import { getCopy } from "@/lib/storefront/copy";
import { formatPrice } from "@/lib/storefront/format";
import { placeOrder, type CheckoutState } from "@/app/[locale]/checkout/actions";
import type { StorefrontLocale } from "@/lib/utils";

export function CheckoutForm({
  locale,
  shippingFee,
  freeShippingThreshold,
}: {
  locale: StorefrontLocale;
  shippingFee: number;
  freeShippingThreshold: number;
}) {
  const copy = getCopy(locale);
  const { cart, hydrated, cartError, clearCart } = useStoreCart();
  const [state, formAction, isPending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const purchasableItems = cart.filter(isPurchasableCartLine);
  const unavailableItems = cart.some((item) => !isPurchasableCartLine(item));
  const subtotalCents = purchasableItems.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
  const subtotal = subtotalCents / 100;
  const discountedSubtotalCents = subtotalCents;
  const shipping = discountedSubtotalCents >= Math.round(freeShippingThreshold * 100) || subtotal === 0 ? 0 : shippingFee;
  const total = discountedSubtotalCents / 100 + shipping;

  useEffect(() => {
    if (state.orderNumber) void clearCart();
  }, [state.orderNumber, clearCart]);

  if (!hydrated) return <div aria-busy="true" className="mx-auto h-96 max-w-[1100px] animate-pulse bg-[#eee8de]" />;

  if (state.orderNumber) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[620px] flex-col items-center justify-center px-5 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#e9ddc5] text-[#785f37]"><Check size={25} /></span>
        <p className="eyebrow mt-6">{copy.checkout.success}</p>
        <h1 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{copy.checkout.success}</h1>
        <p className="mt-5 text-sm text-[#756b60]">{copy.checkout.orderNumber}</p>
        <p className="mt-1 font-medium tracking-[0.1em]">{state.orderNumber}</p>
        <p className="mt-5 max-w-md text-xs leading-6 text-[#766d62]">{copy.checkout.pending}</p>
        <Link href={`/${locale}/products`} className="mt-7 inline-flex min-h-12 items-center bg-[#0d0d0d] px-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">{copy.cart.discover}</Link>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-[600px] flex-col items-center justify-center px-5 text-center">
        <h1 className="font-display text-4xl font-medium">{copy.checkout.empty}</h1>
        <Link href={`/${locale}/products`} className="mt-7 inline-flex min-h-12 items-center bg-[#0d0d0d] px-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">{copy.cart.discover}</Link>
      </div>
    );
  }

  const fieldClass = "rounded-none border-[#ded6ca] bg-white shadow-none focus:border-[#987849]";

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
      <p className="eyebrow">{copy.cart.checkout}</p>
      <h1 className="mt-3 font-display text-4xl font-medium sm:text-6xl">{copy.checkout.title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[#756b60]">{copy.checkout.intro}</p>
      <form action={formAction} className="mt-9 grid gap-8 lg:grid-cols-[1.35fr_.75fr] lg:gap-14">
        <div className="space-y-8">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="items" value={JSON.stringify(purchasableItems.map((item) => ({ variantId: item.variantId, quantity: item.quantity })))} />
          <section className="bg-white p-5 sm:p-7">
            <h2 className="mb-5 font-display text-2xl font-medium">{copy.checkout.contact}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" name="name" label={copy.checkout.name} required className="sm:col-span-2" inputClass={fieldClass} />
              <Field id="email" name="email" type="email" autoComplete="email" label={copy.checkout.email} required inputClass={fieldClass} />
              <Field id="phone" name="phone" type="tel" autoComplete="tel" label={copy.checkout.phone} placeholder="+966 5X XXX XXXX" required inputClass={fieldClass} />
            </div>
          </section>

          <section className="bg-white p-5 sm:p-7">
            <h2 className="mb-5 font-display text-2xl font-medium">{copy.checkout.delivery}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="city" name="city" autoComplete="address-level2" label={copy.checkout.city} required inputClass={fieldClass} />
              <Field id="district" name="district" label={copy.checkout.district} inputClass={fieldClass} />
              <Field id="street" name="street" autoComplete="street-address" label={copy.checkout.street} required className="sm:col-span-2" inputClass={fieldClass} />
              <Field id="postalCode" name="postalCode" autoComplete="postal-code" label={copy.checkout.postal} inputClass={fieldClass} />
            </div>
          </section>

          <section className="bg-white p-5 sm:p-7">
            <h2 className="mb-4 font-display text-2xl font-medium">{copy.checkout.payment}</h2>
            <div className="flex gap-3 border border-[#e5ded2] bg-[#fbf9f5] p-4">
              <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#9a7c49]" />
              <p className="text-xs leading-6 text-[#71685e]">{copy.checkout.paymentText}</p>
            </div>
          </section>
        </div>

        <aside className="h-fit bg-white p-5 sm:p-7">
          <h2 className="font-display text-2xl font-medium">{copy.cart.summary}</h2>
          <div className="mt-5 divide-y divide-[#eee8df]">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 py-3 text-xs">
                <span className="min-w-0 text-[#70675e]">{locale === "ar" ? item.nameAr : item.name} · {item.size ?? (locale === "ar" ? "غير متوفر" : "Unavailable")} × {item.quantity}</span>
                <span className="shrink-0">{formatPrice(item.price * item.quantity, locale)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-4 border-t border-[#e8e2d8] pt-4 text-xs">
            <div className="flex justify-between"><span className="text-[#786f64]">{copy.cart.subtotal}</span><span>{formatPrice(subtotal, locale)}</span></div>
            <div className="flex justify-between"><span className="text-[#786f64]">{copy.cart.shipping}</span><span>{shipping === 0 ? copy.cart.complimentary : formatPrice(shipping, locale)}</span></div>
            <p className="border-t border-[#e8e2d8] pt-3 text-[10px] text-[#81786c]">{copy.cart.vat}</p>
            <div className="flex justify-between border-t border-[#e8e2d8] pt-4 text-sm font-semibold"><span>{copy.cart.total}</span><span>{formatPrice(total, locale)}</span></div>
          </div>
          {unavailableItems && <p role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">{copy.cart.unavailableItemMessage}</p>}
          {cartError && <p role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">{cartError}</p>}
          {state.error && (
            <p role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
              {state.error === "stock" ? copy.checkout.stock : state.error === "validation" ? copy.checkout.validation : copy.checkout.unavailable}
            </p>
          )}
          <button type="submit" disabled={isPending || unavailableItems || purchasableItems.length === 0} className="mt-5 flex min-h-12 w-full items-center justify-center bg-[#0d0d0d] px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#3b3429] disabled:cursor-not-allowed disabled:opacity-60">
            {isPending ? copy.checkout.placing : copy.checkout.place}
          </button>
          <p className="mt-4 text-[10px] leading-5 text-[#81786c]">{copy.checkout.agreement}</p>
        </aside>
      </form>
    </div>
  );
}

function Field({
  id,
  name,
  label,
  className,
  inputClass,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  inputClass: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-[10px] font-semibold">{label}</label>
      <Input id={id} name={name} className={inputClass} {...inputProps} />
    </div>
  );
}
