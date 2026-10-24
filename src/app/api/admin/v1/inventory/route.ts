import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

const inventoryRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER"] as const;
const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  lowStock: z.enum(["0", "1"]).default("0"),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const adjustmentSchema = z.object({
  inventoryId: z.string().trim().min(1).max(191),
  delta: z.number().int().min(-10_000).max(10_000).refine((value) => value !== 0),
  reason: z.string().trim().min(3).max(300),
});

class InsufficientStockError extends Error {}

export async function GET(request: Request) {
  const auth = await authorizeApiAdmin(inventoryRoles);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return validationError(parsed.error);
  const { q, lowStock, page, limit } = parsed.data;
  const where = {
    ...(lowStock === "1" ? { availableStock: { lte: 5 } } : {}),
    ...(q ? { variant: { is: { sku: { contains: q } } } } : {}),
  };

  try {
    const [records, total, lowStockCount] = await Promise.all([
      prisma.inventory.findMany({
        where,
        orderBy: [{ availableStock: "asc" }, { updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          availableStock: true,
          reservedStock: true,
          reorderLevel: true,
          updatedAt: true,
          variant: {
            select: {
              sku: true,
              length: true,
              size: { select: { label: true } },
              color: { select: { name: true, nameAr: true } },
              product: { select: { name: true, nameAr: true } },
            },
          },
        },
      }),
      prisma.inventory.count({ where }),
      prisma.inventory.count({ where: { availableStock: { lte: 5 } } }),
    ]);
    return Response.json({
      data: records,
      pagination: { page, limit, total, pageCount: Math.ceil(total / limit) },
      lowStockCount,
    });
  } catch (error) {
    console.error("Admin inventory listing failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Inventory could not be loaded.");
  }
}

export async function PATCH(request: Request) {
  const auth = await authorizeApiAdmin(inventoryRoles);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = adjustmentSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { id: parsed.data.inventoryId },
        select: { id: true, variant: { select: { sku: true } } },
      });
      if (!inventory) return null;

      const delta = parsed.data.delta;
      const updated = await tx.inventory.updateMany({
        where: {
          id: inventory.id,
          ...(delta < 0 ? { availableStock: { gte: Math.abs(delta) } } : {}),
        },
        data: {
          availableStock: delta < 0 ? { decrement: Math.abs(delta) } : { increment: delta },
        },
      });
      if (updated.count !== 1) throw new InsufficientStockError();

      await tx.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: "ADJUSTMENT",
          quantity: delta,
          reference: "admin:inventory-adjustment",
          note: parsed.data.reason,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          entityType: "Inventory",
          entityId: inventory.id,
          action: "inventory:adjusted",
          details: { sku: inventory.variant.sku, delta, reason: parsed.data.reason },
        },
      });
      return { inventoryId: inventory.id, sku: inventory.variant.sku };
    });
    return result
      ? Response.json({ data: result })
      : apiError(404, "NOT_FOUND", "Inventory record not found.");
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return apiError(409, "INSUFFICIENT_STOCK", "Available stock cannot be reduced below zero.");
    }
    console.error("Admin inventory adjustment failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Inventory could not be adjusted.");
  }
}
