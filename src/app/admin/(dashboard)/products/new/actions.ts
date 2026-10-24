"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { hasAdminRole } from "@/lib/auth/roles";
import { isSafeImagePath, storedImageExists } from "@/lib/storage/local-images";
import { generateProductSlug, productSlugSchema } from "@/lib/catalog/product-slug";

export type CreateProductState = {
  error?: "validation" | "unauthorized" | "unavailable";
  slug?: string;
};

const createProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: productSlugSchema.or(z.literal("")),
  nameAr: z.string().trim().max(160),
  description: z.string().trim().min(10).max(5000),
  descriptionAr: z.string().trim().max(5000),
  fabric: z.string().trim().max(160),
  categoryId: z.string().min(1).max(191),
  colorId: z.string().min(1).max(191),
  price: z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/),
  stock: z.coerce.number().int().min(0).max(10000),
  imageUrl: z.string().trim().max(500).refine(isSafeImagePath),
  imageAlt: z.string().trim().max(200),
  sizeIds: z.array(z.string().min(1).max(191)).min(1).max(12)
    .refine((items) => new Set(items).size === items.length),
});

export async function createProduct(
  _previousState: CreateProductState,
  formData: FormData,
): Promise<CreateProductState> {
  const rawPrice = formData.get("price");
  const parsed = createProductSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    nameAr: formData.get("nameAr") ?? "",
    description: formData.get("description"),
    descriptionAr: formData.get("descriptionAr") ?? "",
    fabric: formData.get("fabric") ?? "",
    categoryId: formData.get("categoryId"),
    colorId: formData.get("colorId"),
    price: typeof rawPrice === "string" ? rawPrice.trim() : "",
    stock: formData.get("stock"),
    imageUrl: formData.get("imageUrl"),
    imageAlt: formData.get("imageAlt") ?? "",
    sizeIds: formData.getAll("sizeIds"),
  });
  if (!parsed.success) return { error: "validation" };

  const admin = await requireAdmin();
  if (!hasAdminRole(admin.roles, ["SUPER_ADMIN", "PRODUCT_MANAGER"])) {
    return { error: "unauthorized" };
  }

  const slug = parsed.data.slug || generateProductSlug(parsed.data.name);
  try {
    if (!(await storedImageExists(parsed.data.imageUrl))) return { error: "validation" };
    const product = await prisma.$transaction(async (tx) => {
      const [category, color, sizes] = await Promise.all([
        tx.category.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } }),
        tx.color.findUnique({ where: { id: parsed.data.colorId }, select: { id: true } }),
        tx.size.findMany({ where: { id: { in: parsed.data.sizeIds } }, select: { id: true, code: true } }),
      ]);
      if (!category || !color || sizes.length !== parsed.data.sizeIds.length) {
        throw new Error("Product references are no longer valid.");
      }

      const product = await tx.product.create({
        data: {
          name: parsed.data.name,
          nameAr: parsed.data.nameAr || null,
          slug,
          description: parsed.data.description,
          descriptionAr: parsed.data.descriptionAr || null,
          fabric: parsed.data.fabric || null,
          categoryId: category.id,
          basePrice: parsed.data.price,
          isPublished: true,
          publishedAt: new Date(),
          images: {
            create: {
              url: parsed.data.imageUrl,
              altText: parsed.data.imageAlt || parsed.data.name,
              sortOrder: 0,
            },
          },
          variants: {
            create: sizes.map((size) => ({
              sizeId: size.id,
              colorId: color.id,
              sku: `${slug.toUpperCase()}-${size.code}`,
              price: parsed.data.price,
              inventory: { create: { availableStock: parsed.data.stock } },
            })),
          },
        },
        select: {
          id: true,
          slug: true,
          variants: { select: { inventory: { select: { id: true } } } },
        },
      });

      const inventoryIds = product.variants.flatMap((variant) => variant.inventory ? [variant.inventory.id] : []);
      if (parsed.data.stock > 0 && inventoryIds.length > 0) {
        await tx.inventoryMovement.createMany({
          data: inventoryIds.map((inventoryId) => ({
            inventoryId,
            type: "RESTOCK",
            quantity: parsed.data.stock,
            reference: product.id,
            note: "Initial stock from product creation.",
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          entityType: "Product",
          entityId: product.id,
          action: "product:created",
          details: { slug: product.slug },
        },
      });
      return product;
    });

    revalidatePath("/admin/products");
    revalidatePath("/en/products");
    revalidatePath("/ar/products");
    return { slug: product.slug };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "validation" };
    }
    console.error("The product could not be created.", error);
    return { error: "unavailable" };
  }
}
