import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { getBestSellingProducts } from "@/lib/admin/analytics";
import { apiError, validationError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

const dashboardRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER", "SUPPORT_AGENT"] as const;
const querySchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("7d"),
});
const daysByRange = { "7d": 7, "30d": 30, "90d": 90 } as const;
const paidStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export async function GET(request: Request) {
  const auth = await authorizeApiAdmin(dashboardRoles);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  const days = daysByRange[parsed.data.range];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const end = new Date();

  try {
    const [ordersCount, paidTotals, lowStock, recentOrders, salesByDay, bestSellers] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.order.aggregate({
        where: { status: { in: [...paidStatuses] }, createdAt: { gte: start, lte: end } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.inventory.count({ where: { availableStock: { lte: 5 } } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          orderNumber: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
          user: { select: { fullName: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.$queryRaw<Array<{ day: string; amount: unknown }>>`
        SELECT DATE_FORMAT(orders.\`createdAt\`, '%Y-%m-%d') AS day, SUM(orders.\`total\`) AS amount
        FROM \`Order\` AS orders
        WHERE orders.\`status\` IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED')
          AND orders.\`createdAt\` >= ${start}
          AND orders.\`createdAt\` <= ${end}
        GROUP BY DATE_FORMAT(orders.\`createdAt\`, '%Y-%m-%d')
        ORDER BY day
      `,
      getBestSellingProducts(start, end, 5),
    ]);

    const sales = Number(paidTotals._sum.total ?? 0);
    const paidOrderCount = paidTotals._count._all;
    const dailyAmounts = new Map(salesByDay.map((entry) => [entry.day, Number(entry.amount)]));
    const chart = Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return { date: day, amount: dailyAmounts.get(day) ?? 0 };
    });

    return Response.json({
      data: {
        range: parsed.data.range,
        metrics: {
          sales,
          orders: ordersCount,
          averageOrderValue: paidOrderCount ? sales / paidOrderCount : 0,
          paidOrders: paidOrderCount,
          lowStock,
        },
        salesByDay: chart,
        bestSellers,
        recentOrders: recentOrders.map((order) => ({
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total.toNumber(),
          currency: order.currency,
          createdAt: order.createdAt,
          customerName: order.user?.fullName ?? null,
          itemCount: order._count.items,
        })),
      },
    });
  } catch (error) {
    console.error("Admin dashboard API query failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Dashboard metrics could not be loaded.");
  }
}
