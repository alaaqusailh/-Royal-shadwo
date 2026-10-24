import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpLeft } from "lucide-react";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { getCopy } from "@/lib/storefront/copy";
import { getCategories, getLocalizedCategoryName, getPublishedProducts } from "@/lib/storefront/catalog";
import { getPublicHome } from "@/lib/api/storefront";
import { isStorefrontLocale, type StorefrontLocale } from "@/lib/utils";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function ContentLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className: string;
}) {
  if (href.startsWith("https://")) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  }
  return <Link href={href} className={className}>{children}</Link>;
}

function toProductCard(product: {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
  price: number;
  compareAtPrice: number | null;
  images: Array<{ url: string; altText: string | null }>;
  available: boolean;
}): ProductCardData {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    nameAr: product.nameAr ?? product.name,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    image: product.images[0]?.url ?? null,
    hoverImage: product.images[1]?.url ?? null,
    imageAlt: product.images[0]?.altText ?? product.name,
    available: product.available,
  };
}

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isStorefrontLocale(rawLocale)) notFound();
  const locale: StorefrontLocale = rawLocale;
  const copy = getCopy(locale);
  const isArabic = locale === "ar";
  const [home, categories] = await Promise.all([getPublicHome(), getCategories()]);
  const fallbackProducts = home.sections.some((section) => section.products.length > 0)
    ? []
    : await getPublishedProducts({ take: 8 });
  const banner = home.banners[0];
  const heroTitle = banner ? (isArabic ? banner.titleAr ?? banner.title : banner.title) : copy.home.title;
  const heroSubtitle = banner
    ? (isArabic ? banner.subtitleAr ?? banner.subtitle : banner.subtitle)
    : copy.home.description;
  const heroLink = banner?.linkUrl;

  return (
    <div>
      <section className="relative isolate min-h-[560px] overflow-hidden bg-[#0d0d0d] text-white sm:min-h-[640px]">
        {banner && (
          <Image
            src={banner.imageUrl}
            alt={banner.altText ?? ""}
            fill
            priority
            sizes="100vw"
            unoptimized
            className="object-cover object-center opacity-70"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d]/95 via-[#0d0d0d]/55 to-[#0d0d0d]/10" />
        <div className={`relative mx-auto flex min-h-[560px] max-w-[1440px] items-center px-6 py-20 sm:min-h-[640px] sm:px-10 lg:px-16 ${isArabic ? "text-right" : "text-left"}`}>
          <div className="max-w-2xl">
            <p className="mb-6 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.28em] text-[#ddc591] sm:text-xs">
              <span className="h-px w-9 bg-[#c8a96c]" />
              {copy.home.eyebrow}
            </p>
            <h1 className="font-display whitespace-pre-line text-5xl font-medium leading-[1.08] tracking-[0.01em] text-[#fbf6ec] sm:text-7xl lg:text-[5.8rem]">
              {heroTitle}
            </h1>
            {heroSubtitle && <p className="mt-7 max-w-lg text-sm leading-7 text-white/70 sm:text-base sm:leading-8">{heroSubtitle}</p>}
            {heroLink ? (
              <ContentLink href={heroLink} className="mt-9 inline-flex min-h-12 items-center gap-3 bg-[#c8a96c] px-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0d0d0d] transition hover:bg-[#dfc999]">
                {copy.home.shop}
                {isArabic ? <ArrowLeft size={15} /> : <ArrowUpLeft size={15} className="rotate-45" />}
              </ContentLink>
            ) : !banner ? (
              <Link href={`/${locale}/products`} className="mt-9 inline-flex min-h-12 items-center gap-3 bg-[#c8a96c] px-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0d0d0d] transition hover:bg-[#dfc999]">
                {copy.home.shop}
                {isArabic ? <ArrowLeft size={15} /> : <ArrowUpLeft size={15} className="rotate-45" />}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="mb-8">
            <p className="eyebrow">{copy.home.collections}</p>
            <h2 className="mt-3 font-display text-4xl font-medium text-[#1a1a1a] sm:text-5xl">{copy.home.collectionIntro}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
            {categories.map((category) => (
              <Link key={category.slug} href={`/${locale}/categories/${category.slug}`} className="group relative isolate aspect-[.79] overflow-hidden bg-[#292522]">
                {category.imageUrl && (
                  <Image
                    src={category.imageUrl}
                    alt={getLocalizedCategoryName(category, locale)}
                    fill
                    sizes="(max-width: 640px) 48vw, (max-width: 1024px) 48vw, 24vw"
                    unoptimized
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d]/90 via-[#0d0d0d]/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
                  <h3 className="font-display text-xl font-medium sm:text-2xl">{getLocalizedCategoryName(category, locale)}</h3>
                  <span className="mt-2 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.17em] text-white/70">
                    {copy.products.view}
                    {isArabic ? <ArrowLeft size={12} /> : <ArrowUpLeft size={12} className="rotate-45" />}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {home.sections.map((section) => (
        <section key={section.id} className="border-y border-[#e7dfd2] bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">{copy.home.collections}</p>
                <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">
                  {isArabic ? section.titleAr ?? section.title : section.title}
                </h2>
                {(isArabic ? section.subtitleAr ?? section.subtitle : section.subtitle) && (
                  <p className="mt-2 max-w-xl text-xs leading-6 text-[#746b60]">
                    {isArabic ? section.subtitleAr ?? section.subtitle : section.subtitle}
                  </p>
                )}
              </div>
              {section.linkUrl && (
                <ContentLink href={section.linkUrl} className="section-link">
                  {copy.home.allProducts}
                  {isArabic ? <ArrowLeft size={14} /> : <ArrowUpLeft size={14} className="rotate-45" />}
                </ContentLink>
              )}
            </div>
            {section.category && (
              <Link href={`/${locale}/categories/${section.category.slug}`} className="text-sm font-medium text-[#785f37] underline underline-offset-4">
                {getLocalizedCategoryName(section.category, locale)}
              </Link>
            )}
            {section.products.length > 0 && (
              <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 sm:gap-5">
                {section.products.map((product) => (
                  <div key={product.id} className="w-[min(70vw,17rem)] shrink-0 snap-start sm:w-[15rem] lg:w-[17rem]">
                    <ProductCard product={toProductCard(product)} locale={locale} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}

      {fallbackProducts.length > 0 && (
        <section className="border-y border-[#e7dfd2] bg-[#f5f0e6]/70">
          <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">{copy.home.collections}</p>
                <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{copy.home.collectionIntro}</h2>
              </div>
              <Link href={`/${locale}/products`} className="section-link">{copy.home.allProducts}</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {fallbackProducts.map((product) => (
                <ProductCard key={product.id} product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  nameAr: product.nameAr ?? product.name,
                  price: product.basePrice.toNumber(),
                  compareAtPrice: product.compareAtPrice?.toNumber() ?? null,
                  image: product.images[0]?.url ?? null,
                  hoverImage: product.images[1]?.url ?? null,
                  imageAlt: product.images[0]?.altText ?? product.name,
                  available: product.variants.some((variant) => (variant.inventory?.availableStock ?? 0) > 0),
                }} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      )}

      {home.promotions.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
          <h2 className="font-display text-3xl font-medium">{copy.home.collections}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.promotions.map((promotion) => (
              <article key={promotion.id} className="border border-[#e7dfd2] bg-white p-5">
                <h3 className="font-medium">{isArabic ? promotion.nameAr ?? promotion.name : promotion.name}</h3>
                {promotion.description && <p className="mt-2 text-sm leading-6 text-[#746b60]">{promotion.description}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
