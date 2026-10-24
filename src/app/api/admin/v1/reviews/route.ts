import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, validationError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

const reviewRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER", "SUPPORT_AGENT"] as const;
const querySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: Request) {
  const auth = await authorizeApiAdmin(reviewRoles);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const where = parsed.data.status ? { status: parsed.data.status } : {};
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (parsed.data.page - 1) * parsed.data.limit,
        take: parsed.data.limit,
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          reviewerName: true,
          verifiedPurchase: true,
          status: true,
          createdAt: true,
          product: { select: { id: true, name: true, nameAr: true, slug: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);
    return Response.json({
      data: reviews,
      pagination: {
        page: parsed.data.page,
        limit: parsed.data.limit,
        total,
        pageCount: Math.ceil(total / parsed.data.limit),
      },
    });
  } catch (error) {
    console.error("Admin review listing failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Reviews could not be loaded.");
  }
}
