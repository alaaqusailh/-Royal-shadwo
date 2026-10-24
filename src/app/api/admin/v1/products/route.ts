import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { imageUrlSchema } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { storedImageExists } from "@/lib/storage/local-images";

const productManagerRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER"] as const;
const productListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["published", "draft"]).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const moneySchema = z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/);
const productCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  nameAr: z.string().trim().max(160).optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  description: z.string().trim().min(10).max(5000),
  descriptionAr: z.string().trim().max(5000).optional(),
  fabric: z.string().trim().max(160).optional(),
  categoryId: z.string().min(1).max(191),
  basePrice: moneySchema,
  compareAtPrice: moneySchema.optional(),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  images: z.array(z.object({
    url: imageUrlSchema,
    altText: z.string().trim().max(200).optional(),
  })).min(1).max(20),
  variants: z.array(z.object({
    sizeId: z.string().min(1).max(191),
    colorId: z.string().min(1).max(191),
    length: z.string().trim().min(1).max(40).default("standard"),
    sku: z.string().trim().min(1).max(191),
    price: moneySchema,
    compareAtPrice: moneySchema.optional(),
    stock: z.number().int().min(0).max(100_000),
  })).min(1).max(200),
}).refine((product) => {
  const skus = product.variants.map(({ sku }) => sku.toLowerCase());
  const combinations = product.variants.map(({ sizeId, colorId, length }) => `${sizeId}\u0000${colorId}\u0000${length}`);
  return new Set(skus).size === skus.length && new Set(combinations).size === combinations.length;
}, { path: ["variants"], message: "Variant SKUs and size/color/length combinations must be unique." });

export async function GET(request: Request) {
  const auth = await authorizeApiAdmin(productManagerRoles);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = productListSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  const { q, status, page, limit } = parsed.data;
  const where = {
    ...(status ? { isPublished: status === "published" } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { nameAr: { contains: q } }, { slug: { contains: q } }] } : {}),
  };
  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          nameAr: true,
          slug: true,
          basePrice: true,
          compareAtPrice: true,
          isPublished: true,
          updatedAt: true,
          category: { select: { id: true, name: true, nameAr: true } },
          images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, altText: true, sortOrder: true } },
          variants: { select: { inventory: { select: { availableStock: true } } } },
        },
      }),
      prisma.product.count({ where }),
    ]);
    return Response.json({
      data: products.map((product) => ({
        ...product,
        basePrice: product.basePrice.toNumber(),
        compareAtPrice: product.compareAtPrice?.toNumber() ?? null,
        availableStock: product.variants.reduce((sum, variant) => sum + (variant.inventory?.availableStock ?? 0), 0),
      })),
      pagination: { page, limit, total, pageCount: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin product listing failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Products could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApiAdmin(productManagerRoles);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = productCreateSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);
  try {
    for (const image of parsed.data.images) {
      if (!(await storedImageExists(image.url))) {
        return apiError(422, "IMAGE_NOT_FOUND", "A selected product image is not available.");
      }
    }
  } catch (error) {
    console.error("Uploaded product image could not be verified.", error);
    return apiError(500, "IMAGE_STORAGE_ERROR", "A product image could not be verified.");
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const [category, sizes, colors] = await Promise.all([
        tx.category.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } }),
        tx.size.findMany({ where: { id: { in: parsed.data.variants.map(({ sizeId }) => sizeId) } }, select: { id: true } }),
        tx.color.findMany({ where: { id: { in: parsed.data.variants.map(({ colorId }) => colorId) } }, select: { id: true } }),
      ]);
      const requiredSizes = new Set(parsed.data.variants.map(({ sizeId }) => sizeId));
      const requiredColors = new Set(parsed.data.variants.map(({ colorId }) => colorId));
      if (
        !category ||
        sizes.length !== requiredSizes.size ||
        colors.length !== requiredColors.size
      ) {
        return null;
      }

      const product = await tx.product.create({
        data: {
          name: parsed.data.name,
          nameAr: parsed.data.nameAr || null,
          slug: parsed.data.slug,
          description: parsed.data.description,
          descriptionAr: parsed.data.descriptionAr || null,
          fabric: parsed.data.fabric || null,
          categoryId: category.id,
          basePrice: parsed.data.basePrice,
          compareAtPrice: parsed.data.compareAtPrice ?? null,
          isFeatured: parsed.data.isFeatured,
          isPublished: parsed.data.isPublished,
          publishedAt: parsed.data.isPublished ? new Date() : null,
          images: {
            create: parsed.data.images.map((image, sortOrder) => ({
              url: image.url,
              altText: image.altText || parsed.data.name,
              sortOrder,
            })),
          },
          variants: {
            create: parsed.data.variants.map((variant) => ({
              sizeId: variant.sizeId,
              colorId: variant.colorId,
              length: variant.length,
              sku: variant.sku,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice ?? null,
              inventory: { create: { availableStock: variant.stock } },
            })),
          },
        },
        select: {
          id: true,
          slug: true,
          variants: { select: { inventory: { select: { id: true, availableStock: true } } } },
        },
      });

      const movements = product.variants.flatMap((variant) =>
        variant.inventory && variant.inventory.availableStock > 0
          ? [{
              inventoryId: variant.inventory.id,
              type: "RESTOCK" as const,
              quantity: variant.inventory.availableStock,
              reference: product.id,
              note: "Initial stock from admin API product creation.",
            }]
          : [],
      );
      if (movements.length > 0) await tx.inventoryMovement.createMany({ data: movements });
      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          entityType: "Product",
          entityId: product.id,
          action: "product:created",
          details: { slug: product.slug, variantCount: product.variants.length },
        },
      });
      return { id: product.id, slug: product.slug };
    });

    if (!created) return apiError(422, "INVALID_REFERENCE", "The category, size, or color selection is no longer available.");
    return Response.json({ data: created }, { status: 201, headers: { Location: `/api/admin/v1/products/${created.id}` } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "CONFLICT", "The product slug or a variant SKU is already in use.");
    }
    console.error("Admin product creation failed.", error);
    return apiError(500, "INTERNAL_ERROR", "The product could not be created.");
  }
}
