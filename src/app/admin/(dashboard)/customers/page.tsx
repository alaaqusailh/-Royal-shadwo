import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { adminDate, adminNumber } from "@/lib/admin/localization";

const pageSize = 20;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin(["SUPER_ADMIN", "SUPPORT_AGENT"]);
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 100) ?? "";
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const where = {
    roles: { some: { role: { name: "CUSTOMER" as const } } },
    ...(query ? { OR: [{ fullName: { contains: query } }, { email: { contains: query } }] } : {}),
  };
  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const queryString = query ? `&q=${encodeURIComponent(query)}` : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs text-neutral-500">علاقات العملاء</p><h2 className="mt-2 text-3xl font-semibold">العملاء</h2></div>
        <form action="/admin/customers" className="flex gap-2">
          <label htmlFor="customer-search" className="sr-only">البحث عن العملاء</label>
          <input id="customer-search" name="q" defaultValue={query} placeholder="الاسم أو البريد الإلكتروني" className="min-h-10 w-56 rounded-xl border border-neutral-300 bg-white px-3 text-sm" />
          <button className="min-h-10 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white">بحث</button>
        </form>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-5 py-3">الاسم</th><th className="px-5 py-3">البريد الإلكتروني</th><th className="px-5 py-3">الهاتف</th><th className="px-5 py-3">الطلبات</th><th className="px-5 py-3">تاريخ التسجيل</th></tr></thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-t border-neutral-100">
                  <td className="px-5 py-4 font-medium">{customer.fullName}</td>
                  <td dir="ltr" className="px-5 py-4 text-right text-neutral-600">{customer.email}</td>
                  <td className="px-5 py-4 text-neutral-600">{customer.phone ?? "—"}</td>
                  <td className="px-5 py-4 text-neutral-600">{adminNumber(customer._count.orders)}</td>
                  <td className="px-5 py-4 text-neutral-600">{adminDate(customer.createdAt)}</td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-neutral-500">{query ? "لا يوجد عملاء تطابق بياناتهم البحث." : "لا يوجد عملاء مسجلون بعد."}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-4 text-xs text-neutral-600">
          <span>{total ? `عرض ${adminNumber((page - 1) * pageSize + 1)}–${adminNumber(Math.min(page * pageSize, total))} من ${adminNumber(total)} عميل` : "لا يوجد عملاء"}</span>
          <div className="flex gap-2">
            {page > 1 && <a href={`/admin/customers?page=${page - 1}${queryString}`} className="rounded-lg border border-neutral-300 px-3 py-2">السابق</a>}
            {page < pageCount && <a href={`/admin/customers?page=${page + 1}${queryString}`} className="rounded-lg border border-neutral-300 px-3 py-2">التالي</a>}
          </div>
        </div>
      </Card>
    </div>
  );
}
