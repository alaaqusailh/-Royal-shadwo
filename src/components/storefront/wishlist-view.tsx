"use client";

import Link from "next/link";
import { ProductCard } from "@/components/storefront/product-card";
import { useStoreCart } from "@/components/storefront/cart-provider";
import { getCopy } from "@/lib/storefront/copy";
import type { StorefrontLocale } from "@/lib/utils";

export function WishlistView({ locale }: { locale: StorefrontLocale }) {
  const copy = getCopy(locale);
  const { favorites, hydrated } = useStoreCart();

  if (!hydrated) return <div aria-busy="true" className="h-72 animate-pulse bg-[#eee8de]" />;

  return (
    <div className="mx-auto min-h-[55vh] max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
      <p className="eyebrow">{copy.wishlist.intro}</p>
      <h1 className="mt-3 font-display text-4xl font-medium sm:text-6xl">{copy.wishlist.title}</h1>
      {favorites.length > 0 ? (
        <div className="mt-9 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 sm:gap-y-12 md:grid-cols-3 lg:grid-cols-4">
          {favorites.map((product) => (
            <ProductCard
              key={product.productId}
              product={{
                id: product.productId,
                slug: product.slug,
                name: product.name,
                nameAr: product.nameAr,
                price: product.price,
                image: product.imageUrl,
                imageAlt: product.name,
              }}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-[#756b5f]">{copy.wishlist.empty}</p>
          <Link href={`/${locale}/products`} className="section-link mx-auto mt-5">{copy.cart.discover}</Link>
        </div>
      )}
    </div>
  );
}
