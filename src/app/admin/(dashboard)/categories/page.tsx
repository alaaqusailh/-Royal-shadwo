import Image from "next/image";
import { Card } from "@/components/ui/card";
import { CategoryCreateForm } from "@/components/admin/category-create-form";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isSafeImagePath } from "@/lib/storage/image-path";

export default async function AdminCategoriesPage() {
  await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      nameAr: true,
      slug: true,
      imageUrl: true,
      description: true,
      descriptionAr: true,
      _count: { select: { products: true, children: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div><p className="text-xs text-neutral-500">الكتالوج</p><h2 className="mt-2 text-3xl font-semibold">التصنيفات</h2><p className="mt-2 text-sm text-neutral-500">إنشاء تصنيفات المتجر بالعربية والإنجليزية ومراجعة المنتجات المرتبطة بها.</p></div>
      <CategoryCreateForm />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <Card key={category.id} className="p-5">
            {category.imageUrl && isSafeImagePath(category.imageUrl) && <Image src={category.imageUrl} alt="" width={640} height={320} unoptimized className="mb-4 aspect-[2/1] w-full rounded-lg bg-neutral-100 object-cover" />}
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-semibold">{category.nameAr ?? category.name}</h3>{category.nameAr && <p className="mt-1 text-sm text-neutral-500" dir="ltr">{category.name}</p>}</div>
              <span dir="ltr" className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs">{category.slug}</span>
            </div>
            <p className="mt-4 min-h-10 text-sm text-neutral-600">{category.descriptionAr ?? category.description ?? "لا يوجد وصف"}</p>
            <div className="mt-4 flex gap-4 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
              <span>{category._count.products} منتج</span>
              <span>{category._count.children} تصنيف فرعي</span>
            </div>
          </Card>
        ))}
        {categories.length === 0 && <Card className="p-10 text-center text-sm text-neutral-500">لم تتم إضافة تصنيفات بعد.</Card>}
      </div>
    </div>
  );
}
