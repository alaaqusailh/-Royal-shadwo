import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, validationError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

const customerRoles = ["SUPER_ADMIN", "SUPPORT_AGENT"] as const;
const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: Request) {
  const auth = await authorizeApiAdmin(customerRoles);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return validationError(parsed.error);
  const { q, page, limit } = parsed.data;
  const where = {
    roles: { some: { role: { name: "CUSTOMER" as const } } },
    ...(q ? { OR: [{ fullName: { contains: q } }, { email: { contains: q } }] } : {}),
  };

  try {
    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    return Response.json({
      data: customers.map(({ _count, ...customer }) => ({
        ...customer,
        orderCount: _count.orders,
      })),
      pagination: { page, limit, total, pageCount: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin customer listing failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Customers could not be loaded.");
  }
}
