"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { isCompareAtPriceValid } from "@/lib/validation/money";
import { isSafeImagePath, isUploadedImagePath } from "@/lib/storage/image-path";
import { storedImageExists } from "@/lib/storage/image-storage";
import { productSlugSchema } from "@/lib/catalog/product-slug";

const moneySchema = z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/);
const imagePathSchema = z.string().trim().max(500).refine((value) => {
  if (isSafeImagePath(value)) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
});
const updateProductSchema = z.object({
  productId: z.string().trim().min(1).max(191),
  name: z.string().trim().min(2).max(160),
  slug: productSlugSchema,
  nameAr: z.string().trim().max(160),
  description: z.string().trim().min(10).max(5000),
  descriptionAr: z.string().trim().max(5000),
  fabric: z.string().trim().max(160),
  categoryId: z.string().trim().min(1).max(191),
  basePrice: moneySchema,
  compareAtPrice: z.union([moneySchema, z.literal("")]),
  isFeatured: z.boolean(),
  images: z.array(z.object({
    url: imagePathSchema,
    altText: z.string().trim().max(200),
  })).min(1).max(8),
}).refine(
  (data) => isCompareAtPriceValid(data.basePrice, data.compareAtPrice || null),
  { path: ["compareAtPrice"], message: "Compare-at price must be greater than the base price." },
);

export type UpdateProductState = {
  error?: "validation" | "not_found" | "unavailable";
  success?: boolean;
  cleanupWarning?: boolean;
};

function getFormString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function updateProduct(
  _previousState: UpdateProductState,
  formData: FormData,
): Promise<UpdateProductState> {
  const imageUrls = formData.getAll("imageUrl");
  const imageAlts = formData.getAll("imageAlt");
  const images = imageUrls.flatMap((value, index) => {
    const url = typeof value === "string" ? value.trim() : "";
    if (!url) return [];
    return [{
      url,
      altText: typeof imageAlts[index] === "string" ? imageAlts[index] : "",
    }];
  });
  const parsed = updateProductSchema.safeParse({
    productId: getFormString(formData, "productId"),
    name: getFormString(formData, "name"),
    slug: getFormString(formData, "slug"),
    nameAr: getFormString(formData, "nameAr"),
    description: getFormString(formData, "description"),
    descriptionAr: getFormString(formData, "descriptionAr"),
    fabric: getFormString(formData, "fabric"),
    categoryId: getFormString(formData, "categoryId"),
    basePrice: getFormString(formData, "basePrice").trim(),
    compareAtPrice: getFormString(formData, "compareAtPrice").trim(),
    isFeatured: formData.get("isFeatured") === "on",
    images,
  });
  if (!parsed.success) return { error: "validation" };
  const admin = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  let existingImageUrls: Set<string>;
  try {
    existingImageUrls = new Set((await prisma.productImage.findMany({
      where: { productId: parsed.data.productId },
      select: { url: true },
    })).map((image) => image.url));
    for (const image of parsed.data.images) {
      if (isSafeImagePath(image.url)) {
        if (!(await storedImageExists(image.url))) return { error: "validation" };
      } else if (!existingImageUrls.has(image.url)) {
        return { error: "validation" };
      }
    }
  } catch (error) {
    console.error("Product image references could not be verified.", error);
    return { error: "unavailable" };
  }

  let replacedImagePaths: string[];
  let previousProductSlug: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingProduct = await tx.product.findUnique({
        where: { id: parsed.data.productId },
        select: { slug: true },
      });
      if (!existingProduct) throw new Error("PRODUCT_OR_CATEGORY_NOT_FOUND");
      const slugOwner = await tx.product.findUnique({
        where: { slug: parsed.data.slug },
        select: { id: true },
      });
      if (slugOwner && slugOwner.id !== parsed.data.productId) throw new Error("PRODUCT_SLUG_TAKEN");
      const previousImages = await tx.productImage.findMany({
        where: { productId: parsed.data.productId },
        select: { url: true },
      });
      const category = await tx.category.findUnique({
        where: { id: parsed.data.categoryId },
        select: { id: true },
      });
      if (!category) throw new Error("PRODUCT_OR_CATEGORY_NOT_FOUND");

      await tx.product.update({
        where: { id: parsed.data.productId },
        data: {
          name: parsed.data.name,
          nameAr: parsed.data.nameAr || null,
          slug: parsed.data.slug,
          description: parsed.data.description,
          descriptionAr: parsed.data.descriptionAr || null,
          fabric: parsed.data.fabric || null,
          categoryId: category.id,
          basePrice: parsed.data.basePrice,
          compareAtPrice: parsed.data.compareAtPrice || null,
          isFeatured: parsed.data.isFeatured,
        },
      });
      await tx.productVariant.updateMany({
        where: { productId: parsed.data.productId },
        data: { price: parsed.data.basePrice },
      });
      await tx.productImage.deleteMany({ where: { productId: parsed.data.productId } });
      await tx.productImage.createMany({
        data: parsed.data.images.map((image, sortOrder) => ({
          productId: parsed.data.productId,
          url: image.url,
          altText: image.altText || parsed.data.name,
          sortOrder,
        })),
      });
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          entityType: "Product",
          entityId: parsed.data.productId,
          action: "product:details_updated",
          details: { previousSlug: existingProduct.slug, slug: parsed.data.slug, imageCount: parsed.data.images.length },
        },
      });
      return {
        previousImagePaths: previousImages.map((image) => image.url),
        slug: existingProduct.slug,
      };
    });
    replacedImagePaths = result.previousImagePaths;
    previousProductSlug = result.slug;
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_SLUG_TAKEN") {
      return { error: "validation" };
    }
    if (error instanceof Error && error.message === "PRODUCT_OR_CATEGORY_NOT_FOUND") {
      return { error: "not_found" };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { error: "validation" };
      if (error.code === "P2025") return { error: "not_found" };
    }
    console.error("Admin product details update failed.", error);
    return { error: "unavailable" };
  }

  const retainedImages = new Set(parsed.data.images.map((image) => image.url));
  let cleanupWarning = false;
  for (const imagePath of new Set(replacedImagePaths)) {
    if (!isUploadedImagePath(imagePath) || retainedImages.has(imagePath)) continue;
    const [productImage, banner, category] = await Promise.all([
      prisma.productImage.findFirst({ where: { url: imagePath }, select: { id: true } }),
      prisma.banner.findFirst({ where: { OR: [{ imageUrl: imagePath }, { mobileImageUrl: imagePath }] }, select: { id: true } }),
      prisma.category.findFirst({ where: { imageUrl: imagePath }, select: { id: true } }),
    ]);
    if (!productImage && !banner && !category) {
      try {
        const { removeUploadedImage } = await import("@/lib/storage/image-storage");
        await removeUploadedImage(imagePath);
      } catch (error) {
        console.error("Replaced unreferenced product image could not be removed.", error);
        cleanupWarning = true;
      }
    }
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${parsed.data.productId}/edit`);
  revalidatePath(`/ar/products/${previousProductSlug}`);
  revalidatePath(`/en/products/${previousProductSlug}`);
  revalidatePath(`/ar/products/${parsed.data.slug}`);
  revalidatePath(`/en/products/${parsed.data.slug}`);
  revalidatePath("/ar/products");
  revalidatePath("/en/products");
  return { success: true, ...(cleanupWarning ? { cleanupWarning: true } : {}) };
}
