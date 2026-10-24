import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

const contentRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER"] as const;
const createSchema = z.object({
  name: z.string().trim().min(2).max(191),
  nameAr: z.string().trim().max(191).optional(),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "BUY_X_GET_Y", "FREE_SHIPPING"]),
  value: z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/).default("0.00"),
  buyQuantity: z.number().int().min(1).max(100).optional(),
  getQuantity: z.number().int().min(1).max(100).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  maxRedemptions: z.number().int().min(1).max(1_000_000).optional(),
  isActive: z.boolean().default(true),
}).refine((promotion) =>
  promotion.type !== "BUY_X_GET_Y" ||
  (promotion.buyQuantity !== undefined && promotion.getQuantity !== undefined),
{ path: ["buyQuantity"], message: "Buy X Get Y promotions require buy and get quantities." })
  .refine((promotion) => promotion.type !== "PERCENTAGE" || Number(promotion.value) <= 100, {
    path: ["value"],
    message: "Percentage discounts cannot exceed 100.",
  })
  .refine((promotion) =>
    !promotion.startsAt || !promotion.endsAt || promotion.startsAt <= promotion.endsAt,
  { path: ["endsAt"], message: "The end date must be after the start date." });

export async function GET() {
  const auth = await authorizeApiAdmin(contentRoles);
  if (!auth.ok) return auth.response;

  try {
    const promotions = await prisma.promotion.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        type: true,
        value: true,
        buyQuantity: true,
        getQuantity: true,
        startsAt: true,
        endsAt: true,
        maxRedemptions: true,
        redemptionCount: true,
        isActive: true,
        createdAt: true,
      },
    });
    return Response.json({
      data: promotions.map((promotion) => ({ ...promotion, value: promotion.value.toNumber() })),
    });
  } catch (error) {
    console.error("Admin promotion listing failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Promotions could not be loaded.");
  }
}

export async function POST(request: Request) {
  const auth = await authorizeApiAdmin(contentRoles);
  if (!auth.ok) return auth.response;
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = createSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const promotion = await prisma.$transaction(async (tx) => {
      const created = await tx.promotion.create({
        data: {
          name: parsed.data.name,
          nameAr: parsed.data.nameAr || null,
          description: parsed.data.description || null,
          type: parsed.data.type,
          value: parsed.data.value,
          buyQuantity: parsed.data.buyQuantity ?? null,
          getQuantity: parsed.data.getQuantity ?? null,
          startsAt: parsed.data.startsAt ?? null,
          endsAt: parsed.data.endsAt ?? null,
          maxRedemptions: parsed.data.maxRedemptions ?? null,
          isActive: parsed.data.isActive,
        },
        select: { id: true, name: true, type: true },
      });
      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          entityType: "Promotion",
          entityId: created.id,
          action: "promotion:created",
          details: { name: created.name, type: created.type },
        },
      });
      return created;
    });
    return Response.json({ data: promotion }, { status: 201, headers: { Location: `/api/admin/v1/promotions/${promotion.id}` } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "CONFLICT", "The promotion conflicts with an existing record.");
    }
    console.error("Admin promotion creation failed.", error);
    return apiError(500, "INTERNAL_ERROR", "The promotion could not be created.");
  }
}
