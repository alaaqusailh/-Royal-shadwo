import { notFound } from "next/navigation";
import { StorefrontHeader } from "@/components/storefront/header";
import { StorefrontFooter } from "@/components/storefront/footer";
import { CartProvider } from "@/components/storefront/cart-provider";
import { getShippingPricing } from "@/lib/storefront/shipping";
import { getCategories } from "@/lib/storefront/catalog";
import { isStorefrontLocale, storefrontLocales } from "@/lib/utils";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export function generateStaticParams() {
  return storefrontLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isArabic = locale === "ar";
  return {
    title: isArabic ? `${BRAND.name.ar} ${BRAND.descriptor.ar}` : `${BRAND.name.en} ${BRAND.descriptor.en}`,
    description: isArabic
      ? "تسوقي عبايات الظل الملكي بتفاصيل أنيقة، مع توصيل إلى أنحاء المملكة العربية السعودية."
      : "Shop refined abayas from Royal Shadow, with delivery across Saudi Arabia.",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isStorefrontLocale(locale)) {
    notFound();
  }

  const isRTL = locale === "ar";
  const [shippingPricing, categories] = await Promise.all([getShippingPricing(), getCategories()]);

  return (
    <CartProvider locale={locale}>
      <div lang={locale} dir={isRTL ? "rtl" : "ltr"} className={`min-h-screen bg-[#faf7f2] text-[#1a1a1a] ${isRTL ? "font-arabic" : ""}`}>
        <StorefrontHeader locale={locale} freeShippingThreshold={shippingPricing.freeShippingThreshold} categories={categories} />
        <main>{children}</main>
        <StorefrontFooter locale={locale} categories={categories} />
      </div>
    </CartProvider>
  );
}
