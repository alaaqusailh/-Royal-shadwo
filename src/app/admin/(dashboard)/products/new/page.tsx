import { ProductCreateForm } from "@/components/admin/product-create-form";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function NewProductPage() {
  await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);

  const [categories, sizes, colors] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, nameAr: true } }),
    prisma.size.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, label: true } }),
    prisma.color.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, hex: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div><p className="text-xs text-neutral-500">الكتالوج</p><h2 className="mt-2 text-3xl font-semibold">إضافة منتج</h2></div>
      <ProductCreateForm
        categories={categories.map((category) => ({ id: category.id, label: category.name, labelAr: category.nameAr }))}
        sizes={sizes.map((size) => ({ id: size.id, label: size.label }))}
        colors={colors.map((color) => ({ id: color.id, label: color.name, hex: color.hex }))}
      />
    </div>
  );
}
