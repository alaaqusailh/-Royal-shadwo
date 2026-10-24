import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { linkUrlSchema } from "@/lib/api/validation";
import { toPublicProduct } from "@/lib/api/storefront";
import { prisma } from "@/lib/db";

const contentRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER"] as const;
const sectionSchema = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  type: z.enum(["PRODUCTS", "CATEGORIES", "BANNER", "PROMOTION"]),
  title: z.string().trim().min(2).max(191),
  titleAr: z.string().trim().max(191).optional(),
  subtitle: z.string().trim().max(191).optional(),
  subtitleAr: z.string().trim().max(191).optional(),
  linkUrl: linkUrlSchema.optional(),
  categoryId: z.string().min(1).max(191).optional(),
  productIds: z.array(z.string().min(1).max(191)).max(100).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
}).refine((section) => new Set(section.productIds).size === section.productIds.length, {
  path: ["productIds"],
  message: "A product can only appear once in a section.",
}).refine((section) => section.type !== "CATEGORIES" || Boolean(section.categoryId), {
  path: ["categoryId"],
  message: "Category sections require a category.",
});

export async function GET() {
  const auth = await authorizeApiAdmin(contentRoles);
  if (!auth.ok) return auth.response;
  try {
    const sections = await prisma.homeSection.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        category: { select: { id: true, name: true, nameAr: true, slug: true } },
        products: {
          orderBy: { sortOrder: "asc" },
          include: { product: { include: { category: true, images: true, variants: { include: { size: true, color: true, inventory: true } } } } },
        },
      },
    });
    return Response.json({
      data: sections.map(({ products, ...section }) => ({
        ...section,
        products: products.map(({ product }) => toPublicProduct({
          ...product,
          variants: product.variants.filter((variant) => variant.isActive),
        })),
      })),
    });
  } catch (error) {
    console.error("Admin homepage section listing failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Homepage sections could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApiAdmin(contentRoles);
  if (!auth.ok) return auth.response;
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = sectionSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const section = await prisma.$transaction(async (tx) => {
      const [category, products] = await Promise.all([
        parsed.data.categoryId
          ? tx.category.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } })
          : Promise.resolve(null),
        parsed.data.productIds.length
          ? tx.product.findMany({ where: { id: { in: parsed.data.productIds } }, select: { id: true } })
          : Promise.resolve([]),
      ]);
      if ((parsed.data.categoryId && !category) || products.length !== parsed.data.productIds.length) return null;

      const created = await tx.homeSection.create({
        data: {
          key: parsed.data.key,
          type: parsed.data.type,
          title: parsed.data.title,
          titleAr: parsed.data.titleAr || null,
          subtitle: parsed.data.subtitle || null,
          subtitleAr: parsed.data.subtitleAr || null,
          linkUrl: parsed.data.linkUrl || null,
          categoryId: category?.id ?? null,
          isActive: parsed.data.isActive,
          sortOrder: parsed.data.sortOrder,
          products: {
            create: parsed.data.productIds.map((productId, sortOrder) => ({
              productId,
              sortOrder,
            })),
          },
        },
        select: { id: true, key: true, type: true },
      });
      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          entityType: "HomeSection",
          entityId: created.id,
          action: "home_section:created",
          details: { key: created.key, productCount: parsed.data.productIds.length },
        },
      });
      return created;
    });

    return section
      ? Response.json({ data: section }, { status: 201, headers: { Location: `/api/admin/v1/home-sections/${section.id}` } })
      : apiError(422, "INVALID_REFERENCE", "The category or one of the selected products does not exist.");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "CONFLICT", "A homepage section with this key already exists.");
    }
    console.error("Admin homepage section creation failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Homepage section could not be created.");
  }
}
