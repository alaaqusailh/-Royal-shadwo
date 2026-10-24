import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductPurchasePanel } from "@/components/storefront/product-purchase-panel";
import { getCopy, getLocalizedFabricName } from "@/lib/storefront/copy";
import { getLocalizedCategoryName, getLocalizedProductName, getProductBySlug } from "@/lib/storefront/catalog";
import { formatPrice } from "@/lib/storefront/format";
import { getShippingPricing } from "@/lib/storefront/shipping";
import { isStorefrontLocale } from "@/lib/utils";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  if (!isStorefrontLocale(rawLocale)) return {};
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const name = getLocalizedProductName(product, rawLocale);
  const description = rawLocale === "ar" ? product.descriptionAr ?? product.description : product.description;
  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      ...(product.images[0] ? { images: [product.images[0].url] } : {}),
    },
  };
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isStorefrontLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const copy = getCopy(locale);
  const product = await getProductBySlug(slug);

  if (!product) notFound();
  const shippingPricing = await getShippingPricing();

  const productName = getLocalizedProductName(product, locale);
  const description = locale === "ar" ? product.descriptionAr ?? product.description : product.description;
  const primaryImage = product.images[0]?.url ?? null;
  const variants = product.variants.map((variant) => ({
    id: variant.id,
    size: variant.size.label,
    color: variant.color.name,
    colorAr: variant.color.nameAr ?? variant.color.name,
    colorCode: variant.color.code,
    colorHex: variant.color.hex,
    price: variant.price.toNumber(),
    stock: variant.inventory?.availableStock ?? 0,
  }));

  return (
    <div lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
      <nav aria-label="Breadcrumb" className="mb-7 flex items-center gap-2 text-[10px] text-[#82796e]">
        <Link href={`/${locale}`} className="transition hover:text-[#8e7448]">{copy.product.home}</Link>
        <ChevronLeft size={12} className={locale === "en" ? "rotate-180" : ""} />
        <Link href={`/${locale}/categories/${product.category.slug}`} className="transition hover:text-[#8e7448]">{getLocalizedCategoryName(product.category, locale)}</Link>
        <ChevronLeft size={12} className={locale === "en" ? "rotate-180" : ""} />
        <span className="line-clamp-1 text-[#1a1a1a]">{productName}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-14">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_.22fr]">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#e5ded3]">
            {primaryImage ? (
              <Image
                src={primaryImage}
                alt={product.images[0]?.altText ?? productName}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#eee8de] to-[#d8cdbd]" aria-hidden="true" />
            )}
            <div className="absolute bottom-4 start-4 flex items-center gap-2 bg-[#0d0d0d]/90 px-2 py-1.5 text-[9px] uppercase tracking-[0.18em] text-[#c8a96c]">
              <Image src={BRAND.logo} alt="" width={28} height={28} className="h-7 w-7 border border-[#c8a96c]/70 object-cover" />
              {BRAND.name.en}
            </div>
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-1 sm:content-start">
              {product.images.slice(1).map((image) => (
                <div key={image.id} className="relative aspect-[4/5] overflow-hidden bg-[#e5ded3]">
                  <Image src={image.url} alt={image.altText ?? productName} fill sizes="(max-width: 640px) 22vw, 15vw" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">{getLocalizedCategoryName(product.category, locale)}</p>
          <h1 className="mt-3 font-display text-4xl font-medium leading-tight text-[#1a1a1a] sm:text-5xl">{productName}</h1>
          <p className="mt-4 text-sm leading-7 text-[#70675e]">{description}</p>
          {product.fabric && (
            <div className="mt-5 border-t border-[#e4ddd2] pt-4 text-xs">
              <span className="font-semibold">{copy.product.fabric}: </span>
              <span className="text-[#746b60]">{getLocalizedFabricName(product.fabric, locale)}</span>
            </div>
          )}
          <div className="my-6 border-t border-[#e4ddd2]" />
          <ProductPurchasePanel
            locale={locale}
            product={{
              price: product.basePrice.toNumber(),
              compareAtPrice: product.compareAtPrice?.toNumber() ?? null,
              requiresSize: product.requiresSize,
            }}
            variants={variants}
            freeShippingThreshold={shippingPricing.freeShippingThreshold}
          />
          <section className="mt-8 border-t border-[#e4ddd2] pt-6">
            <h2 className="font-display text-2xl font-medium">{copy.product.details}</h2>
            <p className="mt-3 text-xs leading-7 text-[#746b60]">{description}</p>
            <p className="mt-4 text-[10px] uppercase tracking-[0.12em] text-[#82796e]">
              {locale === "ar" ? `${BRAND.name.ar} · ${formatPrice(product.basePrice.toNumber(), locale)}` : `${BRAND.name.en.toUpperCase()} · ${formatPrice(product.basePrice.toNumber(), locale)}`}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
