"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { getCopy } from "@/lib/storefront/copy";
import { formatPrice } from "@/lib/storefront/format";
import type { StorefrontLocale } from "@/lib/utils";
import { useStoreCart } from "@/components/storefront/cart-provider";
import { BrandMark } from "@/components/storefront/brand-mark";
import { BRAND } from "@/lib/brand";

export function StorefrontHeader({
  locale,
  freeShippingThreshold,
  categories,
}: {
  locale: StorefrontLocale;
  freeShippingThreshold: number;
  categories: Array<{ name: string; nameAr: string | null; slug: string }>;
}) {
  const copy = getCopy(locale);
  const pathname = usePathname();
  const { itemCount, favorites } = useStoreCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const nextLocale = locale === "ar" ? "en" : "ar";
  const localePath = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${nextLocale}`);
  const navItems = [
    { href: `/${locale}`, label: copy.nav.home },
    { href: `/${locale}/products`, label: copy.nav.shop },
    ...categories.map((category) => ({
      href: `/${locale}/categories/${category.slug}`,
      label: locale === "ar" ? category.nameAr ?? category.name : category.name,
    })),
    { href: `/${locale}/orders`, label: locale === "ar" ? "تتبع طلبك" : "Track order" },
  ];

  return (
    <>
      <div className="overflow-hidden bg-[#c6a66a] text-[#171816]" aria-label="Store announcement">
        <div className="flex items-center justify-center px-4 py-2 text-[10px] font-medium sm:text-xs" dir={locale === "ar" ? "rtl" : "ltr"}>
          <span>{locale === "ar" ? `الشحن المجاني للطلبات فوق ${formatPrice(freeShippingThreshold, locale)}` : `Free shipping over ${formatPrice(freeShippingThreshold, locale)}`}</span>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#171816]/[.97] text-white backdrop-blur-xl">
        <div className="mx-auto flex min-h-[4.7rem] max-w-[1440px] items-center justify-between gap-3 px-4 sm:min-h-[5.25rem] sm:px-8 lg:px-12">
          <button
            type="button"
            aria-label={menuOpen ? (locale === "ar" ? "إغلاق القائمة" : "Close menu") : (locale === "ar" ? "فتح القائمة" : "Open menu")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="header-icon lg:hidden"
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <Link href={`/${locale}`} aria-label={`${BRAND.name[locale]} ${BRAND.descriptor[locale]}`} className="shrink-0">
            <BrandMark compactOnMobile />
          </Link>
          <form action={`/${locale}/search`} className="hidden min-w-40 max-w-[22rem] flex-1 items-center border-b border-white/25 px-2 lg:flex">
            <Search size={15} className="shrink-0 text-white/55" />
            <input
              name="q"
              type="search"
              placeholder={locale === "ar" ? "ابحثي عن عبايتك..." : "Search abayas..."}
              aria-label={copy.nav.search}
              className="h-9 w-full bg-transparent px-2 text-xs text-white outline-none placeholder:text-white/45"
            />
          </form>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href={`/${locale}/search`} aria-label={copy.nav.search} className="header-icon hidden sm:grid lg:hidden">
              <Search size={17} strokeWidth={1.5} />
            </Link>
            <Link href={`/${locale}/account`} aria-label={copy.nav.account} className="header-icon hidden sm:grid">
              <UserRound size={17} strokeWidth={1.5} />
            </Link>
            <Link href={`/${locale}/wishlist`} aria-label={copy.nav.wishlist} className="header-icon relative hidden sm:grid">
              <Heart size={17} strokeWidth={1.5} />
              {favorites.length > 0 && <span className="icon-count">{favorites.length}</span>}
            </Link>
            <Link href={`/${locale}/cart`} aria-label={copy.nav.cart} className="header-icon relative">
              <ShoppingBag size={17} strokeWidth={1.5} />
              {itemCount > 0 && <span className="icon-count">{itemCount}</span>}
            </Link>
            <Link href={localePath} lang={nextLocale} className="ms-1 border-s border-white/20 ps-3 text-[10px] font-semibold tracking-[0.15em] text-[#d5bd8e] sm:ms-2">
              {nextLocale === "ar" ? "العربية" : "EN"}
            </Link>
          </div>
        </div>
        <nav className="hidden items-center justify-center gap-7 overflow-x-auto border-t border-white/10 px-5 py-3 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link shrink-0 text-[10px] font-medium text-white/75 transition hover:text-[#d5bd8e]">
              {item.label}
            </Link>
          ))}
        </nav>
        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" className="absolute inset-0 h-full w-full bg-black/55" aria-label={locale === "ar" ? "إغلاق القائمة" : "Close menu"} onClick={() => setMenuOpen(false)} />
            <nav className="absolute inset-y-0 start-0 flex w-[min(84vw,22rem)] flex-col overflow-y-auto bg-[#171816] px-5 pb-6 pt-5 shadow-2xl" aria-label={locale === "ar" ? "القائمة الرئيسية" : "Main menu"}>
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-5">
                <BrandMark />
                <button type="button" onClick={() => setMenuOpen(false)} aria-label={locale === "ar" ? "إغلاق القائمة" : "Close menu"} className="header-icon"><X size={18} /></button>
              </div>
              <div className="flex flex-col">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="border-b border-white/10 py-3.5 text-sm text-white/80">
                  {item.label}
                </Link>
              ))}
              <Link href={localePath} onClick={() => setMenuOpen(false)} className="py-4 text-sm text-[#d5bd8e]">
                {nextLocale === "ar" ? "العربية" : "English"}
              </Link>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                  <Link href={`/${locale}/search`} onClick={() => setMenuOpen(false)} className="py-2 text-xs text-white/80">{copy.nav.search}</Link>
                  <Link href={`/${locale}/account`} onClick={() => setMenuOpen(false)} className="py-2 text-xs text-white/80">{copy.nav.account}</Link>
                  <Link href={`/${locale}/wishlist`} onClick={() => setMenuOpen(false)} className="py-2 text-xs text-white/80">{copy.nav.wishlist}</Link>
                  <Link href={`/${locale}/cart`} onClick={() => setMenuOpen(false)} className="py-2 text-xs text-white/80">{copy.nav.cart}</Link>
                </div>
                </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
