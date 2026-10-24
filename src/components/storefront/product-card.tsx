"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useStoreCart } from "@/components/storefront/cart-provider";
import { formatPrice } from "@/lib/storefront/format";
import { getCopy } from "@/lib/storefront/copy";
import type { StorefrontLocale } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  price: number;
  compareAtPrice?: number | null;
  image: string | null;
  hoverImage?: string | null;
  imageAlt: string;
  available?: boolean;
};

export function ProductCard({
  product,
  locale,
  label,
}: {
  product: ProductCardData;
  locale: StorefrontLocale;
  label?: string;
}) {
  const copy = getCopy(locale);
  const { isFavorite, toggleFavorite } = useStoreCart();
  const favorite = isFavorite(product.id);
  const name = locale === "ar" ? product.nameAr : product.name;

  return (
    <article className="group min-w-0">
      <div className="product-image-wrap relative aspect-[4/5] overflow-hidden bg-[#e7e1d8]">
        <Link href={`/${locale}/products/${product.slug}`} className="absolute inset-0" aria-label={`${copy.products.view}: ${name}`}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.imageAlt}
              fill
              sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 24vw"
              className="object-cover transition duration-700 group-hover:scale-[1.035]"
            />
          ) : (
            <span className="absolute inset-0 bg-gradient-to-br from-[#eee8de] to-[#d8cdbd]" aria-hidden="true" />
          )}
          {product.image && product.hoverImage && (
            <Image
              src={product.hoverImage}
              alt=""
              fill
              sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 24vw"
              className="pointer-events-none object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </Link>
        {label && <span className="absolute start-3 top-3 bg-[#f2e8d9] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#1a1a1a]">{label}</span>}
        {product.available === false && <span className="absolute inset-x-3 bottom-3 bg-[#171816]/90 px-3 py-2 text-center text-[10px] font-medium text-white">{locale === "ar" ? "نفدت الكمية" : "Out of stock"}</span>}
        {product.available !== false && (
          <span aria-hidden="true" className="absolute bottom-3 start-3 grid h-9 w-9 place-items-center border border-[#c8a96c]/80 bg-[#0d0d0d]/90">
            <Image src={BRAND.logo} alt="" width={30} height={30} className="h-7 w-7 object-cover" />
          </span>
        )}
        {product.compareAtPrice != null && product.compareAtPrice > product.price && (
          <span className="absolute start-3 top-12 bg-[#9b3d31] px-2.5 py-1 text-[10px] font-semibold text-white">
            -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
          </span>
        )}
        <button
          type="button"
          aria-label={favorite ? copy.products.removeFavorite : copy.products.favorite}
          aria-pressed={favorite}
          onClick={() =>
            toggleFavorite({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              nameAr: product.nameAr,
              price: product.price,
              imageUrl: product.image ?? "",
            })
          }
          className={`absolute end-3 top-3 grid h-10 w-10 place-items-center rounded-full backdrop-blur transition ${favorite ? "bg-[#0d0d0d] text-[#d5b87c]" : "bg-white/90 text-[#1a1a1a] hover:bg-[#0d0d0d] hover:text-white"}`}
        >
          <Heart size={17} strokeWidth={1.5} fill={favorite ? "currentColor" : "none"} />
        </button>
        <Link href={`/${locale}/products/${product.slug}`} className="product-quick-view">
          {copy.products.view}
        </Link>
      </div>
      <div className="flex items-start justify-between gap-2 pt-3.5">
        <div className="min-w-0">
          <Link href={`/${locale}/products/${product.slug}`} className="line-clamp-1 text-sm font-medium text-[#1a1a1a] transition hover:text-[#907347] sm:text-[15px]">
            {name}
          </Link>
        </div>
        <div className="shrink-0 text-end text-sm font-medium text-[#1a1a1a]">
          {product.compareAtPrice != null && product.compareAtPrice > product.price && (
            <span className="me-1.5 text-xs text-[#847a6d] line-through">{formatPrice(product.compareAtPrice, locale)}</span>
          )}
          <span>{formatPrice(product.price, locale)}</span>
        </div>
      </div>
      <Link href={`/${locale}/products/${product.slug}`} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 border border-[#d9d1c5] text-[10px] font-medium text-[#242522] transition hover:border-[#242522] hover:bg-[#242522] hover:text-white">
        <ShoppingBag size={14} />
        {product.available === false
          ? (locale === "ar" ? "اكتشفي المنتج" : "View product")
          : (locale === "ar" ? "اختاري المقاس" : "Choose a size")}
      </Link>
    </article>
  );
}
