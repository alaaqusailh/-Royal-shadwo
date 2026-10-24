import { Card } from "@/components/ui/card";
import { CancelOrderForm } from "@/components/admin/cancel-order-form";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { requireAdmin } from "@/lib/auth/require-admin";
import { hasAdminRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db";
import { adminDate, adminLabel, adminNumber, adminPrice } from "@/lib/admin/localization";

const pageSize = 20;
const statuses = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const admin = await requireAdmin(["SUPER_ADMIN", "ORDER_MANAGER", "SUPPORT_AGENT"]);
  const canManageOrders = hasAdminRole(admin.roles, ["SUPER_ADMIN", "ORDER_MANAGER"]);
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 100) ?? "";
  const status = statuses.includes(params.status as (typeof statuses)[number]) ? params.status as (typeof statuses)[number] : undefined;
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const where = {
    ...(status ? { status } : {}),
    ...(query ? { orderNumber: { contains: query } } : {}),
  };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        currency: true,
        createdAt: true,
        user: { select: { fullName: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const filterQuery = `${query ? `&q=${encodeURIComponent(query)}` : ""}${status ? `&status=${status}` : ""}`;

  return (
    <div className="space-y-6">
      <div><p className="text-xs text-neutral-500">إدارة الشحن والتنفيذ</p><h2 className="mt-2 text-3xl font-semibold">الطلبات</h2></div>
      <form action="/admin/orders" className="flex flex-wrap gap-2">
        <label htmlFor="order-search" className="sr-only">البحث برقم الطلب</label>
        <input id="order-search" name="q" defaultValue={query} placeholder="رقم الطلب" className="min-h-10 w-56 rounded-xl border border-neutral-300 bg-white px-3 text-sm" />
        <label htmlFor="status-filter" className="sr-only">تصفية حسب الحالة</label>
        <select id="status-filter" name="status" defaultValue={status ?? ""} className="min-h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm">
          <option value="">جميع الحالات</option>{statuses.map((value) => <option key={value} value={value}>{adminLabel(value)}</option>)}
        </select>
        <button className="min-h-10 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white">تطبيق التصفية</button>
      </form>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-5 py-3">رقم الطلب</th><th className="px-5 py-3">العميل</th><th className="px-5 py-3">التاريخ</th><th className="px-5 py-3">المنتجات</th><th className="px-5 py-3">الحالة</th><th className="px-5 py-3">الإجمالي</th><th className="px-5 py-3">الإجراءات</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderNumber} className="border-t border-neutral-100">
                  <td className="px-5 py-4 font-medium">{order.orderNumber}</td>
                  <td className="px-5 py-4 text-neutral-600">{order.user?.fullName ?? "طلب ضيف"}</td>
                  <td className="px-5 py-4 text-neutral-600">{adminDate(order.createdAt)}</td>
                  <td className="px-5 py-4 text-neutral-600">{adminNumber(order._count.items)}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs">{adminLabel(order.status)}</span></td>
                  <td className="px-5 py-4">{adminPrice(order.total.toNumber())}</td>
                  <td className="px-5 py-4">{canManageOrders ? order.status === "PENDING" ? <CancelOrderForm orderId={order.id} /> : <OrderStatusControl orderId={order.id} status={order.status} /> : <span className="text-xs text-neutral-400">عرض فقط</span>}</td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-neutral-500">لا توجد طلبات تطابق خيارات التصفية.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-4 text-xs text-neutral-600">
          <span>{total ? `عرض ${adminNumber((page - 1) * pageSize + 1)}–${adminNumber(Math.min(page * pageSize, total))} من ${adminNumber(total)} طلب` : "لا توجد طلبات"}</span>
          <div className="flex gap-2">
            {page > 1 && <a href={`/admin/orders?page=${page - 1}${filterQuery}`} className="rounded-lg border border-neutral-300 px-3 py-2">السابق</a>}
            {page < pageCount && <a href={`/admin/orders?page=${page + 1}${filterQuery}`} className="rounded-lg border border-neutral-300 px-3 py-2">التالي</a>}
          </div>
        </div>
      </Card>
    </div>
  );
}
