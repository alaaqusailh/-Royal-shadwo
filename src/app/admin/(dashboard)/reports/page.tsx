import { Card, CardContent } from "@/components/ui/card";
import { getBestSellingProducts } from "@/lib/admin/analytics";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminLabel, adminNumber, adminPrice } from "@/lib/admin/localization";
import Link from "next/link";

const ranges = { "7d": 7, "30d": 30, "90d": 90 } as const;
const paidStatuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin(["SUPER_ADMIN", "ORDER_MANAGER"]);

  const params = await searchParams;
  const range = params.range && params.range in ranges ? params.range as keyof typeof ranges : "30d";
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (ranges[range] - 1));
  const end = new Date();
  const [sales, orderCount, statusCounts, products, customers] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: [...paidStatuses] }, createdAt: { gte: start, lte: end } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: start, lte: end } },
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    getBestSellingProducts(start, end, 8),
    prisma.user.count({
      where: {
        createdAt: { gte: start, lte: end },
        roles: { some: { role: { name: "CUSTOMER" } } },
      },
    }),
  ]);

  const revenue = Number(sales._sum.total ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs text-neutral-500">تحليلات المتجر</p><h2 className="mt-2 text-3xl font-semibold">التقارير</h2><p className="mt-2 text-sm text-neutral-500">إحصاءات مباشرة من الطلبات والمنتجات وسجلات العملاء.</p></div>
        <form action="/admin/reports" className="flex items-center gap-2">
          <label htmlFor="report-range" className="text-sm text-neutral-600">الفترة الزمنية</label>
          <select id="report-range" name="range" defaultValue={range} className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm">
            <option value="7d">7 أيام</option><option value="30d">30 يومًا</option><option value="90d">90 يومًا</option>
          </select>
          <button className="min-h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white">تطبيق</button>
        </form>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["المبيعات المدفوعة", adminPrice(revenue)],
          ["الطلبات المدفوعة", adminNumber(sales._count._all)],
          ["إجمالي الطلبات", adminNumber(orderCount)],
          ["العملاء الجدد", adminNumber(customers)],
        ].map(([label, value]) => <Card key={label}><CardContent className="p-5"><p className="text-sm text-neutral-500">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-neutral-500">الفترة المحددة · ر.س</p></CardContent></Card>)}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="border-b border-neutral-200 p-5"><h3 className="font-semibold">الطلبات حسب الحالة</h3></div>
          <div className="divide-y divide-neutral-100 px-5">
            {statusCounts.map((item) => <div key={item.status} className="flex items-center justify-between py-3 text-sm"><span className="text-neutral-600">{adminLabel(item.status)}</span><span className="font-semibold">{adminNumber(item._count._all)}</span></div>)}
            {statusCounts.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">لا توجد طلبات خلال هذه الفترة.</p>}
          </div>
        </Card>
        <Card>
          <div className="border-b border-neutral-200 p-5"><h3 className="font-semibold">المنتجات الأكثر مبيعًا</h3><p className="mt-1 text-xs text-neutral-500">عدد القطع في الطلبات المدفوعة والمؤكدة.</p></div>
          <div className="divide-y divide-neutral-100 px-5">
            {products.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="truncate font-medium">{item.nameAr ?? item.name}</span><span className="shrink-0 text-neutral-600">{adminNumber(item.unitsSold)} مباعة</span></div>)}
            {products.length === 0 && <p className="py-8 text-center text-sm text-neutral-500">لا توجد مبيعات للمنتجات خلال هذه الفترة.</p>}
          </div>
        </Card>
      </div>
      <p className="text-xs text-neutral-500">لا تشمل المبيعات الطلبات المعلقة أو الملغاة أو المستردة. <Link className="font-medium text-neutral-700 underline" href="/admin/orders">مراجعة الطلبات</Link></p>
    </div>
  );
}
