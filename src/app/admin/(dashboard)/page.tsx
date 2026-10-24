import Link from "next/link";
import { ArrowUpRight, Boxes, CircleDollarSign, ShoppingBag, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getBestSellingProducts } from "@/lib/admin/analytics";
import { prisma } from "@/lib/db";
import { adminDate, adminLabel, adminNumber, adminPrice } from "@/lib/admin/localization";

const paidStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
const ranges = { "7d": 7, "30d": 30, "90d": 90 } as const;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = params.range && params.range in ranges ? params.range as keyof typeof ranges : "7d";
  const days = ranges[range];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const end = new Date();

  const [ordersCount, paidTotals, lowStock, recentOrders, bestSellers, salesByDay] = await Promise.all([
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
        createdAt: true,
        user: { select: { fullName: true } },
        _count: { select: { items: true } },
      },
    }),
    getBestSellingProducts(start, end, 5),
    prisma.$queryRaw<Array<{ day: string; amount: unknown }>>`
      SELECT DATE_FORMAT(orders.\`createdAt\`, '%Y-%m-%d') AS day, SUM(orders.\`total\`) AS amount
      FROM \`Order\` AS orders
      WHERE orders.\`status\` IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED')
        AND orders.\`createdAt\` >= ${start}
        AND orders.\`createdAt\` <= ${end}
      GROUP BY DATE_FORMAT(orders.\`createdAt\`, '%Y-%m-%d')
      ORDER BY day`,
  ]);

  const sales = Number(paidTotals._sum.total ?? 0);
  const paidCount = paidTotals._count._all;
  const dailyAmounts = new Map(salesByDay.map((item) => [item.day, Number(item.amount)]));
  const chart = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { date, amount: dailyAmounts.get(key) ?? 0 };
  });
  const maximum = Math.max(...chart.map((item) => item.amount), 1);

  const metrics = [
    { label: "المبيعات", value: adminPrice(sales), detail: `${adminNumber(paidCount)} طلبات مدفوعة`, icon: CircleDollarSign },
    { label: "الطلبات", value: adminNumber(ordersCount), detail: `آخر ${adminNumber(days)} أيام`, icon: ShoppingBag },
    { label: "متوسط قيمة الطلب", value: adminPrice(paidCount ? sales / paidCount : 0), detail: "للطلبات المدفوعة فقط", icon: TrendingUp },
    { label: "مخزون منخفض", value: adminNumber(lowStock), detail: "5 قطع أو أقل متاحة", icon: Boxes },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-neutral-500">أداء المتجر</p>
          <h2 className="mt-2 text-3xl font-semibold">نظرة عامة</h2>
        </div>
        <form action="/admin" className="flex items-center gap-3">
          <label htmlFor="range" className="text-sm text-neutral-600">الفترة الزمنية</label>
          <select id="range" name="range" defaultValue={range} className="min-h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm">
            <option value="7d">آخر 7 أيام</option>
            <option value="30d">آخر 30 يومًا</option>
            <option value="90d">آخر 90 يومًا</option>
          </select>
          <button className="min-h-10 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white">تطبيق</button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-500">{label}</p>
                <Icon size={18} className="text-[#9a7c49]" />
              </div>
              <h3 className="mt-4 text-2xl font-semibold">{value}</h3>
              <p className="mt-1 text-xs text-neutral-500">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <div className="flex items-center justify-between border-b border-neutral-200 p-5">
            <div><h3 className="text-lg font-medium">المبيعات</h3><p className="mt-1 text-xs text-neutral-500">إيرادات الطلبات المؤكدة يوميًا · ر.س</p></div>
            <span className="text-sm font-semibold">{adminPrice(sales)}</span>
          </div>
          <CardContent className="p-5">
            {salesByDay.length === 0 ? (
              <div className="grid h-56 place-items-center text-sm text-neutral-500">لا توجد مبيعات مدفوعة خلال هذه الفترة.</div>
            ) : (
              <div className="flex h-56 items-end gap-1.5 sm:gap-2">
                {chart.map(({ date, amount }) => (
                  <div key={date.toISOString()} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
                    <span className="mb-2 hidden truncate text-center text-[10px] text-neutral-500 group-hover:block">{adminPrice(amount)}</span>
                    <div
                      className="min-h-1 rounded-t-md bg-[#b59a6b] transition-colors group-hover:bg-[#8b7043]"
                      style={{ height: `${amount ? Math.max(5, (amount / maximum) * 100) : 2}%` }}
                      title={`${adminDate(date)}: ${adminPrice(amount)}`}
                    />
                    {(days <= 7 || date.getDate() === 1) && <span className="mt-2 text-center text-[9px] text-neutral-500">{adminDate(date)}</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <div className="border-b border-neutral-200 p-5"><h3 className="text-lg font-medium">الأكثر مبيعًا</h3><p className="mt-1 text-xs text-neutral-500">حسب عدد القطع المباعة خلال الفترة المحددة</p></div>
          <CardContent className="divide-y divide-neutral-100 p-5">
            {bestSellers.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500">لا توجد مبيعات مكتملة حتى الآن.</p>
            ) : bestSellers.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="min-w-0 truncate font-medium">{item.nameAr ?? item.name}</span>
                <span className="shrink-0 text-neutral-600">{adminNumber(item.unitsSold)} مباعة</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-neutral-200 p-5">
          <div><h3 className="text-lg font-medium">أحدث الطلبات</h3><p className="mt-1 text-xs text-neutral-500">آخر نشاطات العملاء</p></div>
          <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-[#92784b]">جميع الطلبات <ArrowUpRight size={14} /></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-5 py-3">الطلب</th><th className="px-5 py-3">العميل</th><th className="px-5 py-3">المنتجات</th><th className="px-5 py-3">الحالة</th><th className="px-5 py-3">الإجمالي</th></tr></thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.orderNumber} className="border-t border-neutral-100">
                  <td className="px-5 py-4 font-medium">{order.orderNumber}</td>
                  <td className="px-5 py-4 text-neutral-600">{order.user?.fullName ?? "طلب ضيف"}</td>
                  <td className="px-5 py-4 text-neutral-600">{adminNumber(order._count.items)}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs">{adminLabel(order.status)}</span></td>
                  <td className="px-5 py-4">{adminPrice(order.total.toNumber())}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-500">لم يتم تسجيل أي طلبات حتى الآن.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
