import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { getCopy } from "@/lib/storefront/copy";
import { getCategories, getPublishedProducts, getLocalizedCategoryName, toProductCardData } from "@/lib/storefront/catalog";
import { prisma } from "@/lib/db";
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
  const category = await prisma.category.findFirst({
    where: { slug, products: { some: { isPublished: true } } },
    select: { name: true, nameAr: true, description: true, descriptionAr: true, imageUrl: true },
  });
  if (!category) return {};
  const name = getLocalizedCategoryName(category, rawLocale);
  const description = rawLocale === "ar" ? category.descriptionAr ?? category.description : category.description;
  return {
    title: name,
    description: description ?? name,
    openGraph: {
      title: name,
      description: description ?? name,
      images: [category.imageUrl ?? BRAND.socialImage],
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isStorefrontLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const copy = getCopy(locale);
  const category = await prisma.category.findFirst({
    where: { slug, products: { some: { isPublished: true } } },
    select: { name: true, nameAr: true, description: true, descriptionAr: true, slug: true },
  });
  if (!category) notFound();

  const [products, categories] = await Promise.all([
    getPublishedProducts({ category: slug }),
    getCategories(),
  ]);
  const cards: ProductCardData[] = products.map(toProductCardData);
  const categoryName = getLocalizedCategoryName(category, locale);
  const description = locale === "ar" ? category.descriptionAr ?? category.description : category.description;

  return (
    <div lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-[65vh]">
      <section className="border-b border-[#e7dfd2] bg-[#f2e8d9]/50 px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <p className="eyebrow">{copy.products.category}</p>
          <h1 className="mt-3 font-display text-4xl font-medium sm:text-6xl">{categoryName}</h1>
          {description && <p className="mt-3 max-w-xl text-sm leading-7 text-[#756b60]">{description}</p>}
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
        <nav aria-label={copy.products.category} className="mb-7 flex flex-wrap gap-2 border-b border-[#e5ded2] pb-5">
          {categories.map((item) => (
            <Link key={item.slug} href={`/${locale}/categories/${item.slug}`} className={`filter-chip ${item.slug === slug ? "filter-chip-active" : ""}`}>
              {getLocalizedCategoryName(item, locale)}
            </Link>
          ))}
        </nav>
        {cards.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 sm:gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {cards.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-[#756b5f]">{copy.products.empty}</p>
            <Link href={`/${locale}/products`} className="section-link mx-auto mt-5">{copy.products.all}</Link>
          </div>
        )}
      </section>
    </div>
  );
}
