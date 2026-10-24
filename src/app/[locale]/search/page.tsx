import { Search } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductCard, type ProductCardData } from "@/components/storefront/product-card";
import { Input } from "@/components/ui/input";
import { getCopy } from "@/lib/storefront/copy";
import { getPublishedProducts, toProductCardData } from "@/lib/storefront/catalog";
import { isStorefrontLocale } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  if (!isStorefrontLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const copy = getCopy(locale);
  const term = query.q?.trim().slice(0, 80) ?? "";
  const products = term ? await getPublishedProducts({ search: term }) : [];
  const cards: ProductCardData[] = products.map(toProductCardData);

  return (
    <div lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto min-h-[65vh] max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
      <p className="eyebrow">{copy.nav.search}</p>
      <h1 className="mt-3 font-display text-4xl font-medium sm:text-6xl">{copy.nav.search}</h1>
      <form action={`/${locale}/search`} className="mt-8 flex max-w-2xl items-center gap-3 border-b border-[#a99b88] pb-3">
        <Search size={19} className="shrink-0 text-[#82796e]" />
        <Input
          name="q"
          defaultValue={term}
          placeholder={locale === "ar" ? "ابحثي عن عبايتك المفضلة" : "Search the collection"}
          aria-label={copy.nav.search}
          className="h-12 border-0 bg-transparent px-0 text-sm shadow-none focus:border-0"
        />
        <button type="submit" className="bg-[#0d0d0d] px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-white transition hover:bg-[#41382a]">
          {copy.nav.search}
        </button>
      </form>
      {term && (
        cards.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 sm:gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {cards.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}
          </div>
        ) : (
          <p className="mt-10 border border-[#e5ded2] bg-white px-5 py-12 text-center text-sm text-[#756b5f]">{copy.products.empty}</p>
        )
      )}
    </div>
  );
}
