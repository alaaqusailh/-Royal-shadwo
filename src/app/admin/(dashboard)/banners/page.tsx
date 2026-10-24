import Image from "next/image";
import { Card } from "@/components/ui/card";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { BannerCreateForm } from "@/components/admin/banner-create-form";
import { BannerLinkEditor } from "@/components/admin/banner-link-editor";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { adminDate, adminNumber } from "@/lib/admin/localization";

export default async function AdminBannersPage() {
  await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const banners = await prisma.banner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      titleAr: true,
      imageUrl: true,
      mobileImageUrl: true,
      linkUrl: true,
      sortOrder: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-neutral-500">محتوى المتجر</p>
        <h2 className="mt-2 text-3xl font-semibold">اللافتات</h2>
        <p className="mt-2 text-sm text-neutral-500">إدارة محتوى اللافتات وحالة النشر، مع رفع الصور مباشرة من جهازك.</p>
      </div>
      <BannerCreateForm />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-5 py-3">اللافتة</th><th className="px-5 py-3">الصورة</th><th className="px-5 py-3">الرابط</th><th className="px-5 py-3">الترتيب</th><th className="px-5 py-3">الجدول الزمني</th><th className="px-5 py-3">الحالة</th><th className="px-5 py-3">الإجراء</th></tr></thead>
            <tbody>
              {banners.map((banner) => (
                <tr key={banner.id} className="border-t border-neutral-100">
                  <td className="px-5 py-4"><span className="block font-medium">{banner.titleAr ?? banner.title}</span>{banner.titleAr && <span dir="ltr" className="mt-1 block text-xs text-neutral-500">{banner.title}</span>}</td>
                  <td className="max-w-64 px-5 py-4 text-xs text-neutral-600">
                    {banner.imageUrl.startsWith("/uploads/") || banner.imageUrl.startsWith("/banners/") ? <Image src={banner.imageUrl} alt="" width={160} height={90} unoptimized className="mb-2 h-14 w-24 rounded bg-neutral-100 object-cover" /> : null}
                    <span dir="ltr" className="break-all">{banner.imageUrl}</span>
                    {banner.mobileImageUrl && <span className="mt-1 block break-all" dir="ltr">الجوال: {banner.mobileImageUrl}</span>}
                  </td>
                  <td className="px-5 py-4"><BannerLinkEditor id={banner.id} initialValue={banner.linkUrl} /></td>
                  <td className="px-5 py-4 text-neutral-600">{adminNumber(banner.sortOrder)}</td>
                  <td className="px-5 py-4 text-xs text-neutral-600">{banner.startsAt ? adminDate(banner.startsAt) : "دون تاريخ بدء"}<br />إلى {banner.endsAt ? adminDate(banner.endsAt) : "دون تاريخ انتهاء"}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${banner.isActive ? "bg-emerald-50 text-emerald-800" : "bg-neutral-100 text-neutral-600"}`}>{banner.isActive ? "نشط" : "غير نشط"}</span></td>
                  <td className="px-5 py-4"><ActiveToggle endpoint={`/api/admin/v1/banners/${banner.id}`} active={banner.isActive} /></td>
                </tr>
              ))}
              {banners.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-neutral-500">لم تتم إضافة لافتات بعد.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
