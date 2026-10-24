import "server-only";
import { prisma } from "@/lib/db";

export const productCardInclude = {
  category: { select: { slug: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 2 },
  variants: {
    where: { isActive: true },
    include: { inventory: true, size: true, color: true },
    orderBy: { size: { sortOrder: "asc" as const } },
  },
};

export async function getPublishedProducts(options?: {
  category?: string;
  search?: string;
  sort?: "newest" | "price-asc" | "price-desc";
  featured?: boolean;
  take?: number;
}) {
  return prisma.product.findMany({
    where: {
      isPublished: true,
      ...(options?.featured ? { isFeatured: true } : {}),
      ...(options?.category ? { category: { slug: options.category } } : {}),
      ...(options?.search
        ? {
            OR: [
              { name: { contains: options.search } },
              { nameAr: { contains: options.search } },
              { description: { contains: options.search } },
              { descriptionAr: { contains: options.search } },
            ],
          }
        : {}),
    },
    include: productCardInclude,
    orderBy:
      options?.sort === "price-asc"
        ? { basePrice: "asc" }
        : options?.sort === "price-desc"
          ? { basePrice: "desc" }
          : options?.sort === "newest"
            ? { publishedAt: "desc" }
            : [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    ...(options?.take ? { take: options.take } : {}),
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isPublished: true },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        where: { isActive: true },
        include: { size: true, color: true, inventory: true },
        orderBy: { size: { sortOrder: "asc" } },
      },
    },
  });
}

export async function getCategories() {
  return prisma.category.findMany({
    where: { products: { some: { isPublished: true } } },
    orderBy: { slug: "asc" },
    select: { name: true, nameAr: true, slug: true, imageUrl: true },
  });
}

export function toProductCardData(product: Awaited<ReturnType<typeof getPublishedProducts>>[number]) {
  const availableVariant = product.variants.find((variant) => (variant.inventory?.availableStock ?? 0) > 0);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    nameAr: product.nameAr ?? product.name,
    price: product.basePrice.toNumber(),
    compareAtPrice: product.compareAtPrice?.toNumber() ?? null,
    image: product.images[0]?.url ?? null,
    hoverImage: product.images[1]?.url ?? null,
    imageAlt: product.images[0]?.altText ?? product.name,
    available: Boolean(availableVariant),
  };
}

export function getLocalizedProductName(product: { name: string; nameAr: string | null }, locale: "en" | "ar") {
  return locale === "ar" ? product.nameAr ?? product.name : product.name;
}

export function getLocalizedCategoryName(category: { name: string; nameAr?: string | null }, locale: "en" | "ar") {
  return locale === "ar" ? category.nameAr ?? category.name : category.name;
}
