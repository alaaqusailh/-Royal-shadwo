import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { imageUrlSchema, linkUrlSchema } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { storedImageExists } from "@/lib/storage/local-images";

const contentRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER"] as const;
const bannerSchema = z.object({
  title: z.string().trim().min(2).max(191),
  titleAr: z.string().trim().max(191).optional(),
  subtitle: z.string().trim().max(2000).optional(),
  subtitleAr: z.string().trim().max(2000).optional(),
  imageUrl: imageUrlSchema,
  mobileImageUrl: imageUrlSchema.optional(),
  altText: z.string().trim().max(191).optional(),
  linkUrl: linkUrlSchema.optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
}).refine((banner) =>
  !banner.startsAt || !banner.endsAt || banner.startsAt <= banner.endsAt,
{ path: ["endsAt"], message: "The end date must be after the start date." });

export async function GET() {
  const auth = await authorizeApiAdmin(contentRoles);
  if (!auth.ok) return auth.response;
  try {
    const banners = await prisma.banner.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return Response.json({ data: banners });
  } catch (error) {
    console.error("Admin banner listing failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Banners could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApiAdmin(contentRoles);
  if (!auth.ok) return auth.response;
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = bannerSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);
  try {
    if (!(await storedImageExists(parsed.data.imageUrl)) ||
      (parsed.data.mobileImageUrl && !(await storedImageExists(parsed.data.mobileImageUrl)))) {
      return apiError(422, "IMAGE_NOT_FOUND", "A selected banner image is not available.");
    }
  } catch (error) {
    console.error("Uploaded banner image could not be verified.", error);
    return apiError(500, "IMAGE_STORAGE_ERROR", "The banner image could not be verified.");
  }

  try {
    const banner = await prisma.$transaction(async (tx) => {
      const created = await tx.banner.create({
        data: {
          ...parsed.data,
          titleAr: parsed.data.titleAr || null,
          subtitle: parsed.data.subtitle || null,
          subtitleAr: parsed.data.subtitleAr || null,
          mobileImageUrl: parsed.data.mobileImageUrl || null,
          altText: parsed.data.altText || null,
          linkUrl: parsed.data.linkUrl || null,
          startsAt: parsed.data.startsAt ?? null,
          endsAt: parsed.data.endsAt ?? null,
        },
        select: { id: true, title: true },
      });
      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          entityType: "Banner",
          entityId: created.id,
          action: "banner:created",
          details: { title: created.title },
        },
      });
      return created;
    });
    return Response.json({ data: banner }, { status: 201, headers: { Location: `/api/admin/v1/banners/${banner.id}` } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "CONFLICT", "The banner conflicts with an existing record.");
    }
    console.error("Admin banner creation failed.", error);
    return apiError(500, "INTERNAL_ERROR", "The banner could not be created.");
  }
}
