import { Card } from "@/components/ui/card";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { HomeSectionCreateForm } from "@/components/admin/home-section-create-form";
import { HomeSectionLinkEditor } from "@/components/admin/home-section-link-editor";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminNumber } from "@/lib/admin/localization";
import { prisma } from "@/lib/db";

const sectionLabels = {
  PRODUCTS: "منتجات",
  CATEGORIES: "تصنيف",
  BANNER: "محتوى نصي",
  PROMOTION: "عرض ترويجي",
} as const;

export default async function HomeSectionsPage() {
  await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const [sections, categories, products] = await Promise.all([
    prisma.homeSection.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        category: { select: { name: true, nameAr: true } },
        products: { select: { product: { select: { name: true, nameAr: true } } } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, nameAr: true } }),
    prisma.product.findMany({ where: { isPublished: true }, orderBy: { name: "asc" }, select: { id: true, name: true, nameAr: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-neutral-500">محتوى المتجر</p>
        <h2 className="mt-2 text-3xl font-semibold">أقسام الصفحة الرئيسية</h2>
        <p className="mt-2 text-sm text-neutral-500">أضف أقسامًا من المنتجات والتصنيفات المخزنة في قاعدة البيانات، وأدر روابطها الاختيارية.</p>
      </div>
      <HomeSectionCreateForm categories={categories} products={products} />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-5 py-3">القسم</th>
                <th className="px-5 py-3">النوع والمحتوى</th>
                <th className="px-5 py-3">الرابط (اختياري)</th>
                <th className="px-5 py-3">الترتيب</th>
                <th className="px-5 py-3">الحالة</th>
                <th className="px-5 py-3">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.id} className="border-t border-neutral-100 align-top">
                  <td className="px-5 py-4">
                    <span className="block font-medium">{section.titleAr ?? section.title}</span>
                    <span dir="ltr" className="mt-1 block text-xs text-neutral-400">{section.key}</span>
                  </td>
                  <td className="px-5 py-4 text-xs text-neutral-600">
                    <span>{sectionLabels[section.type]}</span>
                    {section.category && <span className="mt-1 block">{section.category.nameAr ?? section.category.name}</span>}
                    {section.products.length > 0 && <span className="mt-1 block">{adminNumber(section.products.length)} منتجات</span>}
                  </td>
                  <td className="px-5 py-4"><HomeSectionLinkEditor id={section.id} initialValue={section.linkUrl} /></td>
                  <td className="px-5 py-4">{adminNumber(section.sortOrder)}</td>
                  <td className="px-5 py-4">{section.isActive ? "نشط" : "غير نشط"}</td>
                  <td className="px-5 py-4"><ActiveToggle endpoint={`/api/admin/v1/home-sections/${section.id}`} active={section.isActive} /></td>
                </tr>
              ))}
              {sections.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-neutral-500">لم تتم إضافة أقسام بعد.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
