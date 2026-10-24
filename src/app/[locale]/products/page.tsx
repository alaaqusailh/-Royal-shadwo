import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { getCopy } from "@/lib/storefront/copy";
import { getCategories, getPublishedProducts, getLocalizedCategoryName, toProductCardData } from "@/lib/storefront/catalog";
import { isStorefrontLocale, type StorefrontLocale } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ar" ? "تسوقي جميع العبايات" : "Shop All Abayas",
  };
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const [{ locale: rawLocale }, filters] = await Promise.all([params, searchParams]);
  if (!isStorefrontLocale(rawLocale)) notFound();
  const locale: StorefrontLocale = rawLocale;
  const copy = getCopy(locale);
  const sort = filters.sort === "price-asc" || filters.sort === "price-desc" ? filters.sort : "newest";
  const [products, categories] = await Promise.all([
    getPublishedProducts({ category: filters.category, sort }),
    getCategories(),
  ]);
  const cardProducts: ProductCardData[] = products.map(toProductCardData);

  return (
    <div lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-[65vh]">
      <section className="border-b border-[#e7dfd2] bg-[#f2e8d9]/50 px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <p className="eyebrow">{copy.products.category}</p>
          <h1 className="mt-3 font-display text-4xl font-medium sm:text-6xl">{copy.products.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#756b60]">{copy.products.intro}</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-9 sm:px-8 sm:py-12 lg:px-12">
        <div className="flex flex-col gap-5 border-b border-[#e5ded2] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label={copy.products.category} className="flex flex-wrap gap-2">
            <Link href={`/${locale}/products`} className={`filter-chip ${!filters.category ? "filter-chip-active" : ""}`}>{copy.products.all}</Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/${locale}/products?category=${category.slug}`}
                className={`filter-chip ${filters.category === category.slug ? "filter-chip-active" : ""}`}
              >
                {getLocalizedCategoryName(category, locale)}
              </Link>
            ))}
          </nav>
          <form action={`/${locale}/products`} className="flex shrink-0 items-center gap-2">
            {filters.category && <input type="hidden" name="category" value={filters.category} />}
            <label htmlFor="sort" className="text-[10px] text-[#82796e]">{copy.products.sort}</label>
            <select id="sort" name="sort" defaultValue={sort} className="h-10 border border-[#ddd4c7] bg-white px-3 text-xs outline-none focus:border-[#9b7d4d]">
              <option value="newest">{copy.products.newest}</option>
              <option value="price-asc">{copy.products.priceLow}</option>
              <option value="price-desc">{copy.products.priceHigh}</option>
            </select>
          </form>
        </div>

        <div className="mt-8 flex items-center justify-between text-[10px] text-[#82796e]">
          <span>{products.length} {copy.products.results}</span>
        </div>
        {cardProducts.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 sm:gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {cardProducts.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}
          </div>
        ) : (
          <p className="mt-6 border border-[#e5ded2] bg-white px-5 py-16 text-center text-sm text-[#756b5f]">{copy.products.empty}</p>
        )}
      </section>
    </div>
  );
}
