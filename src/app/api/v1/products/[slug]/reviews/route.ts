import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { authorizeApiCustomer } from "@/lib/api/customer-auth";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(191).optional(),
  body: z.string().trim().min(10).max(4000),
});
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const paidStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (slug.length > 191 || !slugPattern.test(slug)) {
    return apiError(400, "INVALID_SLUG", "A valid product slug is required.");
  }
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const product = await prisma.product.findFirst({
      where: { slug, isPublished: true },
      select: { id: true },
    });
    if (!product) return apiError(404, "NOT_FOUND", "Product not found.");

    const where = { productId: product.id, status: "APPROVED" as const };
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (parsed.data.page - 1) * parsed.data.limit,
        take: parsed.data.limit,
        select: {
          rating: true,
          title: true,
          body: true,
          reviewerName: true,
          verifiedPurchase: true,
          createdAt: true,
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
    console.error("Public product reviews could not be loaded.", error);
    return apiError(500, "INTERNAL_ERROR", "Reviews could not be loaded.");
  }
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const auth = await authorizeApiCustomer();
  if (!auth.ok) return auth.response;

  const { slug } = await context.params;
  if (slug.length > 191 || !slugPattern.test(slug)) {
    return apiError(400, "INVALID_SLUG", "A valid product slug is required.");
  }
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = createSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const product = await prisma.product.findFirst({
      where: { slug, isPublished: true },
      select: { id: true },
    });
    if (!product) return apiError(404, "NOT_FOUND", "Product not found.");

    const purchase = await prisma.orderItem.findFirst({
      where: {
        productVariant: { is: { productId: product.id } },
        order: { is: { userId: auth.userId, status: { in: [...paidStatuses] } } },
      },
      select: { id: true },
    });
    const review = await prisma.review.create({
      data: {
        productId: product.id,
        userId: auth.userId,
        reviewerName: auth.fullName,
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        body: parsed.data.body,
        verifiedPurchase: Boolean(purchase),
      },
      select: { id: true, status: true, createdAt: true },
    });
    return Response.json({ data: review }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "REVIEW_EXISTS", "You have already submitted a review for this product.");
    }
    console.error("Customer product review could not be created.", error);
    return apiError(500, "INTERNAL_ERROR", "The review could not be submitted.");
  }
}
