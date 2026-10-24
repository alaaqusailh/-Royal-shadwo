import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { prisma } from "@/lib/db";
import { isCompareAtPriceValid } from "@/lib/validation/money";

const productManagerRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER"] as const;
const moneySchema = z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/);
const patchSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  nameAr: z.string().trim().max(160).nullable().optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  descriptionAr: z.string().trim().max(5000).nullable().optional(),
  fabric: z.string().trim().max(160).nullable().optional(),
  categoryId: z.string().min(1).max(191).optional(),
  basePrice: moneySchema.optional(),
  compareAtPrice: moneySchema.nullable().optional(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiAdmin(productManagerRoles);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!id || id.length > 191) return apiError(400, "INVALID_ID", "A valid product id is required.");

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nameAr: true,
        slug: true,
        description: true,
        descriptionAr: true,
        fabric: true,
        basePrice: true,
        compareAtPrice: true,
        isFeatured: true,
        isPublished: true,
        publishedAt: true,
        categoryId: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: {
          orderBy: [{ size: { sortOrder: "asc" } }, { length: "asc" }],
          include: {
            size: true,
            color: true,
            inventory: true,
          },
        },
      },
    });
    if (!product) return apiError(404, "NOT_FOUND", "Product not found.");
    return Response.json({
      data: {
        ...product,
        basePrice: product.basePrice.toNumber(),
        compareAtPrice: product.compareAtPrice?.toNumber() ?? null,
        variants: product.variants.map((variant) => ({
          ...variant,
          price: variant.price.toNumber(),
          compareAtPrice: variant.compareAtPrice?.toNumber() ?? null,
        })),
      },
    });
  } catch (error) {
    console.error("Admin product lookup failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Product could not be loaded.");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiAdmin(productManagerRoles);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!id || id.length > 191) return apiError(400, "INVALID_ID", "A valid product id is required.");
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = patchSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id },
        select: { id: true, isPublished: true, basePrice: true, compareAtPrice: true },
      });
      if (!existing) return null;
      if (parsed.data.isPublished === true) {
        const archiveRecord = await tx.auditLog.findFirst({
          where: { entityType: "Product", entityId: id, action: "product:archived" },
          select: { id: true },
        });
        if (archiveRecord) throw new Error("PRODUCT_ARCHIVED");
      }
      if (parsed.data.categoryId) {
        const category = await tx.category.findUnique({
          where: { id: parsed.data.categoryId },
          select: { id: true },
        });
        if (!category) return null;
      }
      const nextBasePrice = parsed.data.basePrice ?? existing.basePrice.toString();
      const nextCompareAtPrice = parsed.data.compareAtPrice === undefined
        ? existing.compareAtPrice?.toString() ?? null
        : parsed.data.compareAtPrice;
      if (
        (parsed.data.basePrice !== undefined || parsed.data.compareAtPrice !== undefined)
        && !isCompareAtPriceValid(nextBasePrice, nextCompareAtPrice)
      ) {
        throw new Error("INVALID_COMPARE_AT_PRICE");
      }

      const {
        categoryId,
        isPublished,
        ...fields
      } = parsed.data;
      const updated = await tx.product.update({
        where: { id },
        data: {
          ...fields,
          ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
          ...(isPublished === undefined ? {} : {
            isPublished,
            ...(isPublished && !existing.isPublished ? { publishedAt: new Date() } : {}),
          }),
        },
        select: { id: true, slug: true, isPublished: true },
      });
      if (parsed.data.basePrice !== undefined) {
        await tx.productVariant.updateMany({
          where: { productId: id },
          data: { price: parsed.data.basePrice },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          entityType: "Product",
          entityId: updated.id,
          action: "product:updated",
          details: { slug: updated.slug, fields: Object.keys(parsed.data) },
        },
      });
      return updated;
    });

    if (!product) return apiError(404, "NOT_FOUND_OR_INVALID_REFERENCE", "The product or category was not found.");
    return Response.json({ data: product });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_COMPARE_AT_PRICE") {
      return apiError(400, "INVALID_COMPARE_AT_PRICE", "Compare-at price must be greater than the base price.");
    }
    if (error instanceof Error && error.message === "PRODUCT_ARCHIVED") {
      return apiError(409, "PRODUCT_ARCHIVED", "Archived products cannot be published.");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "CONFLICT", "The product slug is already in use.");
    }
    console.error("Admin product update failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Product could not be updated.");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiAdmin(productManagerRoles);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!id || id.length > 191) return apiError(400, "INVALID_ID", "A valid product id is required.");

  try {
    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id },
        select: { id: true, slug: true },
      });
      if (!existing) return null;
      const archiveRecord = await tx.auditLog.findFirst({
        where: { entityType: "Product", entityId: id, action: "product:archived" },
        select: { id: true },
      });
      if (archiveRecord) return { ...existing, alreadyArchived: true };

      await tx.product.update({
        where: { id },
        data: { isPublished: false },
      });
      await tx.productVariant.updateMany({
        where: { productId: id },
        data: { isActive: false },
      });
      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          entityType: "Product",
          entityId: id,
          action: "product:archived",
          details: { slug: existing.slug },
        },
      });
      return { ...existing, alreadyArchived: false };
    });

    return product
      ? Response.json({ data: { id: product.id, archived: true, alreadyArchived: product.alreadyArchived } })
      : apiError(404, "NOT_FOUND", "Product not found.");
  } catch (error) {
    console.error("Admin product archive failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Product could not be archived.");
  }
}
