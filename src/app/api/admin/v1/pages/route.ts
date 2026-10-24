import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

const pageRoles = ["SUPER_ADMIN"] as const;
const pageSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(191),
  title: z.string().trim().min(2).max(191),
  titleAr: z.string().trim().max(191).optional(),
  content: z.string().max(100_000),
  contentAr: z.string().max(100_000).optional(),
  seoTitle: z.string().trim().max(191).optional(),
  seoTitleAr: z.string().trim().max(191).optional(),
  seoDescription: z.string().trim().max(2000).optional(),
  seoDescriptionAr: z.string().trim().max(2000).optional(),
  isPublished: z.boolean().default(false),
});

export async function GET() {
  const auth = await authorizeApiAdmin(pageRoles);
  if (!auth.ok) return auth.response;
  try {
    const pages = await prisma.page.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        titleAr: true,
        seoTitle: true,
        seoTitleAr: true,
        isPublished: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    return Response.json({ data: pages });
  } catch (error) {
    console.error("Admin page listing failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Pages could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApiAdmin(pageRoles);
  if (!auth.ok) return auth.response;
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = pageSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const page = await prisma.$transaction(async (tx) => {
      const created = await tx.page.create({
        data: {
          ...parsed.data,
          titleAr: parsed.data.titleAr || null,
          contentAr: parsed.data.contentAr || null,
          seoTitle: parsed.data.seoTitle || null,
          seoTitleAr: parsed.data.seoTitleAr || null,
          seoDescription: parsed.data.seoDescription || null,
          seoDescriptionAr: parsed.data.seoDescriptionAr || null,
          publishedAt: parsed.data.isPublished ? new Date() : null,
        },
        select: { id: true, slug: true, isPublished: true },
      });
      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          entityType: "Page",
          entityId: created.id,
          action: "page:created",
          details: { slug: created.slug },
        },
      });
      return created;
    });
    return Response.json({ data: page }, { status: 201, headers: { Location: `/api/admin/v1/pages/${page.id}` } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "CONFLICT", "The page slug is already in use.");
    }
    console.error("Admin page creation failed.", error);
    return apiError(500, "INTERNAL_ERROR", "The page could not be created.");
  }
}
