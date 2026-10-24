import { Card } from "@/components/ui/card";
import { InventoryAdjustmentForm } from "@/components/admin/inventory-adjustment-form";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { adminNumber } from "@/lib/admin/localization";

const pageSize = 20;

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; lowStock?: string; page?: string }>;
}) {
  await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 100) ?? "";
  const lowStockOnly = params.lowStock === "1";
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const where = {
    ...(lowStockOnly ? { availableStock: { lte: 5 } } : {}),
    ...(query ? { variant: { is: { sku: { contains: query } } } } : {}),
  };
  const [inventory, total, lowStockCount] = await Promise.all([
    prisma.inventory.findMany({
      where,
      orderBy: [{ availableStock: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        availableStock: true,
        reservedStock: true,
        reorderLevel: true,
        variant: {
          select: {
            sku: true,
            size: { select: { label: true } },
            color: { select: { name: true } },
            product: { select: { name: true, nameAr: true } },
          },
        },
      },
    }),
    prisma.inventory.count({ where }),
    prisma.inventory.count({ where: { availableStock: { lte: 5 } } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs text-neutral-500">إدارة المخزون</p><h2 className="mt-2 text-3xl font-semibold">المخزون</h2></div>
        <div className="flex flex-wrap gap-2">
          <form action="/admin/inventory" className="flex gap-2">
            <label htmlFor="inventory-search" className="sr-only">البحث برقم المنتج</label>
            <input id="inventory-search" name="q" defaultValue={query} placeholder="ابحث برقم المنتج" className="min-h-10 w-44 rounded-xl border border-neutral-300 bg-white px-3 text-sm" />
            {lowStockOnly && <input type="hidden" name="lowStock" value="1" />}
            <button className="min-h-10 rounded-xl border border-neutral-300 bg-white px-4 text-sm">بحث</button>
          </form>
          <a href={lowStockOnly ? "/admin/inventory" : "/admin/inventory?lowStock=1"} className="inline-flex min-h-10 items-center rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white">{lowStockOnly ? "عرض كل المخزون" : `مخزون منخفض (${adminNumber(lowStockCount)})`}</a>
        </div>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-5 py-3">المنتج / الرمز</th><th className="px-5 py-3">المقاس واللون</th><th className="px-5 py-3">المتاح</th><th className="px-5 py-3">المحجوز</th><th className="px-5 py-3">حد إعادة الطلب</th><th className="px-5 py-3">تعديل المخزون</th></tr></thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id} className="border-t border-neutral-100">
                  <td className="px-5 py-4"><span className="block font-medium">{item.variant.product.nameAr ?? item.variant.product.name}</span><span dir="ltr" className="mt-1 block text-xs text-neutral-500">{item.variant.sku}</span></td>
                  <td className="px-5 py-4 text-neutral-600">{item.variant.size.label} · {item.variant.color.name}</td>
                  <td className={`px-5 py-4 font-semibold ${item.availableStock <= item.reorderLevel ? "text-amber-700" : "text-neutral-700"}`}>{adminNumber(item.availableStock)}</td>
                  <td className="px-5 py-4 text-neutral-600">{adminNumber(item.reservedStock)}</td>
                  <td className="px-5 py-4 text-neutral-600">{adminNumber(item.reorderLevel)}</td>
                  <td className="px-5 py-4"><InventoryAdjustmentForm inventoryId={item.id} /></td>
                </tr>
              ))}
              {inventory.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-neutral-500">{query ? "لا توجد نتائج تطابق البحث." : "لا توجد سجلات للمخزون بعد."}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-4 text-xs text-neutral-600">
          <span>{total ? `عرض ${adminNumber((page - 1) * pageSize + 1)}–${adminNumber(Math.min(page * pageSize, total))} من ${adminNumber(total)} سجل` : "لا توجد سجلات"}</span>
          <div className="flex gap-2">
            {page > 1 && <a href={`/admin/inventory?page=${page - 1}${query ? `&q=${encodeURIComponent(query)}` : ""}${lowStockOnly ? "&lowStock=1" : ""}`} className="rounded-lg border border-neutral-300 px-3 py-2">السابق</a>}
            {page < pageCount && <a href={`/admin/inventory?page=${page + 1}${query ? `&q=${encodeURIComponent(query)}` : ""}${lowStockOnly ? "&lowStock=1" : ""}`} className="rounded-lg border border-neutral-300 px-3 py-2">التالي</a>}
          </div>
        </div>
      </Card>
    </div>
  );
}
