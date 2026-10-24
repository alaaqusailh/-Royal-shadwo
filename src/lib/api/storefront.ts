import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export const productListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().min(1).max(191).optional(),
  size: z.string().trim().min(1).max(40).optional(),
  color: z.string().trim().min(1).max(80).optional(),
  fabric: z.string().trim().min(1).max(100).optional(),
  minPrice: z.coerce.number().finite().min(0).optional(),
  maxPrice: z.coerce.number().finite().min(0).optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "best-selling"]).default("newest"),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
}).refine(
  ({ minPrice, maxPrice }) => minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
  { path: ["maxPrice"], message: "Maximum price must be at least the minimum price." },
);

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

const publicProductInclude = {
  category: { select: { name: true, nameAr: true, slug: true } },
  images: {
    orderBy: { sortOrder: "asc" as const },
    select: { url: true, altText: true, sortOrder: true },
  },
  variants: {
    where: { isActive: true },
    orderBy: [{ size: { sortOrder: "asc" as const } }, { length: "asc" as const }],
    select: {
      id: true,
      length: true,
      price: true,
      size: { select: { code: true, label: true } },
      color: { select: { code: true, name: true, nameAr: true, hex: true } },
      inventory: { select: { availableStock: true } },
    },
  },
} satisfies Prisma.ProductInclude;

export type PublicProduct = Prisma.ProductGetPayload<{ include: typeof publicProductInclude }>;

export function toPublicProduct(product: PublicProduct) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    nameAr: product.nameAr,
    requiresSize: product.requiresSize,
    description: product.description,
    descriptionAr: product.descriptionAr,
    fabric: product.fabric,
    price: product.basePrice.toNumber(),
    compareAtPrice: product.compareAtPrice?.toNumber() ?? null,
    category: product.category,
    images: product.images,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      length: variant.length,
      price: variant.price.toNumber(),
      size: variant.size,
      color: variant.color,
      available: (variant.inventory?.availableStock ?? 0) > 0,
    })),
    available: product.variants.some((variant) => (variant.inventory?.availableStock ?? 0) > 0),
  };
}

function productWhere(query: ProductListQuery) {
  return {
    isPublished: true,
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.fabric ? { fabric: { contains: query.fabric } } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? {
          basePrice: {
            ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
            ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q } },
            { nameAr: { contains: query.q } },
            { description: { contains: query.q } },
            { descriptionAr: { contains: query.q } },
          ],
        }
      : {}),
    ...(query.size || query.color
      ? {
          variants: {
            some: {
              isActive: true,
              ...(query.size ? { size: { code: query.size } } : {}),
              ...(query.color ? { color: { code: query.color } } : {}),
            },
          },
        }
      : {}),
  };
}

export async function listPublicProducts(query: ProductListQuery) {
  const where = productWhere(query);
  const skip = (query.page - 1) * query.limit;

  if (query.sort === "best-selling") {
    const soldProducts = await prisma.$queryRaw<Array<{ productId: string }>>`
      SELECT variant.productId AS productId
      FROM orderitem AS item
      INNER JOIN \`order\` AS storeOrder ON storeOrder.id = item.orderId
      INNER JOIN productvariant AS variant ON variant.id = item.variantId
      WHERE storeOrder.status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED')
      GROUP BY variant.productId
      ORDER BY SUM(item.quantity) DESC, variant.productId ASC
      LIMIT 1000
    `;
    const rankedIds = soldProducts.map((product) => product.productId);
    const matchingProducts = await prisma.product.findMany({
      where: { ...where, id: { in: rankedIds } },
      select: { id: true },
    });
    const matchingIds = new Set(matchingProducts.map((product) => product.id));
    const orderedIds = rankedIds.filter((id) => matchingIds.has(id));
    const pageIds = orderedIds.slice(skip, skip + query.limit);
    const pageProducts = await prisma.product.findMany({
      where: { id: { in: pageIds } },
      include: publicProductInclude,
    });
    const productsById = new Map(pageProducts.map((product) => [product.id, product]));

    return {
      data: pageIds.flatMap((id) => {
        const product = productsById.get(id);
        return product ? [toPublicProduct(product)] : [];
      }),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: orderedIds.length,
        pageCount: Math.ceil(orderedIds.length / query.limit),
      },
    };
  }

  const orderBy = query.sort === "price-asc"
    ? { basePrice: "asc" as const }
    : query.sort === "price-desc"
      ? { basePrice: "desc" as const }
      : [{ publishedAt: "desc" as const }, { id: "desc" as const }];
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
      include: publicProductInclude,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products.map(toPublicProduct),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pageCount: Math.ceil(total / query.limit),
    },
  };
}

export async function getPublicProduct(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, isPublished: true },
    include: publicProductInclude,
  });
  if (!product) return null;

  const reviews = await prisma.review.aggregate({
    where: { productId: product.id, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return {
    ...toPublicProduct(product),
    reviewSummary: {
      averageRating: reviews._avg.rating,
      count: reviews._count._all,
    },
  };
}

export async function getPublicHome() {
  const now = new Date();
  const activeWindow = [
    { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
    { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
  ];
  const [banners, sections, promotions] = await Promise.all([
    prisma.banner.findMany({
      where: { isActive: true, AND: activeWindow },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        titleAr: true,
        subtitle: true,
        subtitleAr: true,
        imageUrl: true,
        mobileImageUrl: true,
        altText: true,
        linkUrl: true,
      },
    }),
    prisma.homeSection.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        key: true,
        type: true,
        title: true,
        titleAr: true,
        subtitle: true,
        subtitleAr: true,
        linkUrl: true,
        category: { select: { name: true, nameAr: true, slug: true } },
        products: {
          where: { product: { isPublished: true } },
          orderBy: { sortOrder: "asc" },
          take: 12,
          select: {
            sortOrder: true,
            product: { include: publicProductInclude },
          },
        },
      },
    }),
    prisma.promotion.findMany({
      where: { isActive: true, AND: activeWindow },
      orderBy: [{ startsAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        type: true,
        value: true,
        buyQuantity: true,
        getQuantity: true,
        startsAt: true,
        endsAt: true,
      },
    }),
  ]);

  return {
    banners,
    sections: sections.map((section) => ({
      ...section,
      products: section.products.map(({ product }) => toPublicProduct(product)),
    })),
    promotions: promotions.map((promotion) => ({
      ...promotion,
      value: promotion.value.toNumber(),
    })),
  };
}

export async function getPublicSettings() {
  const allowedKeys = [
    "store.name",
    "store.currency",
    "store.vatRate",
    "store.defaultShippingFee",
    "store.freeShippingThreshold",
    "store.defaultLocale",
    "store.arEnabled",
    "store.supportEmail",
    "store.supportPhone",
  ];
  const settings = await prisma.storeSetting.findMany({
    where: { key: { in: allowedKeys } },
    select: { key: true, value: true },
  });
  const values = new Map(settings.map(({ key, value }) => [key, value]));
  const numericSetting = (key: string) => {
    const rawValue = values.get(key);
    if (rawValue === undefined) return null;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`Public store setting "${key}" has an invalid numeric value.`);
    }
    return parsed;
  };

  return {
    name: values.get("store.name") ?? null,
    currency: values.get("store.currency") ?? null,
    vatRate: numericSetting("store.vatRate"),
    defaultShippingFee: numericSetting("store.defaultShippingFee"),
    freeShippingThreshold: numericSetting("store.freeShippingThreshold"),
    defaultLocale: values.get("store.defaultLocale") ?? null,
    arabicEnabled: values.get("store.arEnabled") === "true",
    supportEmail: values.get("store.supportEmail") ?? null,
    supportPhone: values.get("store.supportPhone") ?? null,
  };
}
