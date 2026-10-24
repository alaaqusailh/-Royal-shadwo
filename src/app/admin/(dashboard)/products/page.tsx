import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { ProductArchiveButton } from "@/components/admin/product-archive-button";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { adminNumber, adminPrice } from "@/lib/admin/localization";
import { isSafeImagePath } from "@/lib/storage/image-path";

const pageSize = 15;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 100) ?? "";
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const where = query
    ? { OR: [{ name: { contains: query } }, { nameAr: { contains: query } }] }
    : {};
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        nameAr: true,
        basePrice: true,
        isPublished: true,
        updatedAt: true,
        category: { select: { name: true, nameAr: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        variants: { select: { inventory: { select: { availableStock: true } } } },
      },
    }),
    prisma.product.count({ where }),
  ]);
  const archivedProducts = await prisma.auditLog.findMany({
    where: {
      entityType: "Product",
      action: "product:archived",
      entityId: { in: products.map((product) => product.id) },
    },
    select: { entityId: true },
    distinct: ["entityId"],
  });
  const archivedProductIds = new Set(archivedProducts.map((entry) => entry.entityId));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const queryString = query ? `&q=${encodeURIComponent(query)}` : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>        <p className="text-xs text-neutral-500">الكتالوج</p><h2 className="mt-2 text-3xl font-semibold">المنتجات</h2></div>
        <div className="flex flex-wrap gap-2">
          <form action="/admin/products" className="flex gap-2">
            <label htmlFor="product-search" className="sr-only">البحث عن المنتجات</label>
            <input id="product-search" name="q" defaultValue={query} placeholder="ابحث باسم المنتج" className="min-h-10 w-56 rounded-xl border border-neutral-300 bg-white px-3 text-sm" />
            <button className="min-h-10 rounded-xl bg-white px-4 text-sm font-medium text-neutral-800 ring-1 ring-neutral-300">بحث</button>
          </form>
          <Link href="/admin/products/new" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white"><Plus size={15} /> إضافة منتج</Link>
        </div>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-5 py-3">المنتج</th><th className="px-5 py-3">التصنيف</th><th className="px-5 py-3">السعر</th><th className="px-5 py-3">المتاح</th><th className="px-5 py-3">الحالة</th><th className="px-5 py-3">الإجراءات</th></tr></thead>
            <tbody>
              {products.map((product) => {
                const stock = product.variants.reduce((sum, variant) => sum + (variant.inventory?.availableStock ?? 0), 0);
                const archived = archivedProductIds.has(product.id);
                return (
                  <tr key={product.id} className="border-t border-neutral-100">
                    <td className="px-5 py-4"><div className="flex items-center gap-3">{product.images[0] && isSafeImagePath(product.images[0].url) ? <Image src={product.images[0].url} alt="" width={48} height={60} unoptimized className="h-14 w-12 rounded bg-neutral-100 object-cover" /> : null}<div><span className="block font-medium">{product.nameAr ?? product.name}</span>{product.nameAr && <span className="mt-1 block text-xs text-neutral-500">{product.name}</span>}</div></div></td>
                    <td className="px-5 py-4 text-neutral-600">{product.category.nameAr ?? product.category.name}</td>
                    <td className="px-5 py-4">{adminPrice(product.basePrice.toNumber())}</td>
                    <td className={`px-5 py-4 ${stock <= 5 ? "font-semibold text-amber-700" : "text-neutral-600"}`}>{adminNumber(stock)}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${archived ? "bg-red-50 text-red-800" : product.isPublished ? "bg-emerald-50 text-emerald-800" : "bg-neutral-100 text-neutral-600"}`}>{archived ? "مؤرشف" : product.isPublished ? "منشور" : "مسودة"}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        {!archived && <ActiveToggle endpoint={`/api/admin/v1/products/${product.id}`} active={product.isPublished} field="isPublished" />}
                        <Link href={`/admin/products/${product.id}/edit`} className="text-xs font-medium text-neutral-700 underline underline-offset-4 hover:text-neutral-950">تعديل</Link>
                        {!archived && <ProductArchiveButton endpoint={`/api/admin/v1/products/${product.id}`} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-neutral-500">{query ? "لا توجد منتجات تطابق البحث." : "لم تتم إضافة أي منتجات بعد."}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-4 text-xs text-neutral-600">
          <span>{total ? `عرض ${adminNumber((page - 1) * pageSize + 1)}–${adminNumber(Math.min(page * pageSize, total))} من ${adminNumber(total)} منتج` : "لا توجد منتجات"}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`/admin/products?page=${page - 1}${queryString}`} className="rounded-lg border border-neutral-300 px-3 py-2">السابق</Link>}
            {page < pageCount && <Link href={`/admin/products?page=${page + 1}${queryString}`} className="rounded-lg border border-neutral-300 px-3 py-2">التالي</Link>}
          </div>
        </div>
      </Card>
    </div>
  );
}
