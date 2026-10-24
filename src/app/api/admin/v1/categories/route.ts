import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { imageUrlSchema } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { storedImageExists } from "@/lib/storage/image-storage";

const categoryRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER"] as const;
const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(160),
  nameAr: z.string().trim().max(160).optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  description: z.string().trim().max(191).optional(),
  descriptionAr: z.string().trim().max(2000).optional(),
  imageUrl: imageUrlSchema.optional(),
  parentId: z.string().min(1).max(191).optional(),
});

export async function GET() {
  const auth = await authorizeApiAdmin(categoryRoles);
  if (!auth.ok) return auth.response;

  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        nameAr: true,
        slug: true,
        description: true,
        descriptionAr: true,
        imageUrl: true,
        parentId: true,
        _count: { select: { products: true, children: true } },
      },
    });
    return Response.json({ data: categories });
  } catch (error) {
    console.error("Admin category listing failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Categories could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApiAdmin(categoryRoles);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = createCategorySchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);
  try {
    if (parsed.data.imageUrl && !(await storedImageExists(parsed.data.imageUrl))) {
      return apiError(422, "IMAGE_NOT_FOUND", "The selected category image is not available.");
    }
  } catch (error) {
    console.error("Uploaded category image could not be verified.", error);
    return apiError(500, "IMAGE_STORAGE_ERROR", "The category image could not be verified.");
  }

  try {
    const category = await prisma.$transaction(async (tx) => {
      if (parsed.data.parentId) {
        const parent = await tx.category.findUnique({ where: { id: parsed.data.parentId }, select: { id: true } });
        if (!parent) return null;
      }

      const created = await tx.category.create({
        data: {
          name: parsed.data.name,
          nameAr: parsed.data.nameAr || null,
          slug: parsed.data.slug,
          description: parsed.data.description || null,
          descriptionAr: parsed.data.descriptionAr || null,
          imageUrl: parsed.data.imageUrl || null,
          parentId: parsed.data.parentId ?? null,
        },
        select: { id: true, slug: true },
      });
      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          entityType: "Category",
          entityId: created.id,
          action: "category:created",
          details: { slug: created.slug },
        },
      });
      return created;
    });

    if (!category) return apiError(422, "INVALID_REFERENCE", "The parent category does not exist.");
    return Response.json({ data: category }, { status: 201, headers: { Location: `/api/admin/v1/categories/${category.id}` } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "CONFLICT", "The category slug is already in use.");
    }
    console.error("Admin category creation failed.", error);
    return apiError(500, "INTERNAL_ERROR", "The category could not be created.");
  }
}
