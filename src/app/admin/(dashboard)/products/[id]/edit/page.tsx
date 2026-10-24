import { notFound } from "next/navigation";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        nameAr: true,
        description: true,
        descriptionAr: true,
        fabric: true,
        categoryId: true,
        basePrice: true,
        compareAtPrice: true,
        isFeatured: true,
        images: { orderBy: { sortOrder: "asc" }, select: { url: true, altText: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, nameAr: true },
    }),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-neutral-500">الكتالوج</p>
        <h2 className="mt-2 text-3xl font-semibold">تعديل المنتج</h2>
      </header>
      <ProductEditForm
        product={{
          ...product,
          basePrice: product.basePrice.toString(),
          compareAtPrice: product.compareAtPrice?.toString() ?? "",
        }}
        categories={categories}
      />
    </div>
  );
}
