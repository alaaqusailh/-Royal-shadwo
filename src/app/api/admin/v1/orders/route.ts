import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, validationError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

const orderRoles = ["SUPER_ADMIN", "ORDER_MANAGER", "SUPPORT_AGENT"] as const;
const statuses = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;
const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(statuses).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: Request) {
  const auth = await authorizeApiAdmin(orderRoles);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  const { q, status, page, limit } = parsed.data;
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { orderNumber: { contains: q } } : {}),
  };

  try {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          currency: true,
          subtotal: true,
          discountAmount: true,
          shippingFee: true,
          vatAmount: true,
          total: true,
          createdAt: true,
          user: { select: { fullName: true, email: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return Response.json({
      data: orders.map((order) => ({
        ...order,
        subtotal: order.subtotal.toNumber(),
        discountAmount: order.discountAmount.toNumber(),
        shippingFee: order.shippingFee.toNumber(),
        vatAmount: order.vatAmount.toNumber(),
        total: order.total.toNumber(),
      })),
      pagination: { page, limit, total, pageCount: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin order listing failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Orders could not be loaded.");
  }
}
