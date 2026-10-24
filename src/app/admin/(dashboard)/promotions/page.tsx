import { Card } from "@/components/ui/card";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { PromotionCreateForm } from "@/components/admin/promotion-create-form";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { adminDate, adminNumber, adminPrice } from "@/lib/admin/localization";

const promotionLabels = {
  PERCENTAGE: "نسبة مئوية",
  FIXED_AMOUNT: "مبلغ ثابت",
  BUY_X_GET_Y: "اشترِ X واحصل على Y",
  FREE_SHIPPING: "شحن مجاني",
} as const;

function promotionValue(promotion: {
  type: keyof typeof promotionLabels;
  value: number;
  buyQuantity: number | null;
  getQuantity: number | null;
}) {
  if (promotion.type === "PERCENTAGE") return `${promotion.value}%`;
  if (promotion.type === "FIXED_AMOUNT") return adminPrice(promotion.value);
  if (promotion.type === "BUY_X_GET_Y") return `اشترِ ${adminNumber(promotion.buyQuantity ?? 0)} · واحصل على ${adminNumber(promotion.getQuantity ?? 0)}`;
  return "شحن مجاني";
}

export default async function AdminPromotionsPage() {
  await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const promotions = await prisma.promotion.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      name: true,
      nameAr: true,
      type: true,
      value: true,
      buyQuantity: true,
      getQuantity: true,
      startsAt: true,
      endsAt: true,
      maxRedemptions: true,
      redemptionCount: true,
      isActive: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-neutral-500">عروض المتجر</p>
        <h2 className="mt-2 text-3xl font-semibold">العروض الترويجية</h2>
        <p className="mt-2 text-sm text-neutral-500">إنشاء العروض وتفعيلها وحفظها في قاعدة بيانات المتجر.</p>
      </div>
      <PromotionCreateForm />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-5 py-3">العرض</th><th className="px-5 py-3">النوع</th><th className="px-5 py-3">القيمة</th><th className="px-5 py-3">الجدول الزمني</th><th className="px-5 py-3">الاستخدامات</th><th className="px-5 py-3">الحالة</th><th className="px-5 py-3">الإجراء</th></tr></thead>
            <tbody>
              {promotions.map((promotion) => (
                <tr key={promotion.id} className="border-t border-neutral-100">
                  <td className="px-5 py-4"><span className="block font-medium">{promotion.nameAr ?? promotion.name}</span>{promotion.nameAr && <span dir="ltr" className="mt-1 block text-xs text-neutral-500">{promotion.name}</span>}</td>
                  <td className="px-5 py-4 text-neutral-600">{promotionLabels[promotion.type]}</td>
                  <td className="px-5 py-4 font-medium">{promotionValue({ ...promotion, value: promotion.value.toNumber() })}</td>
                  <td className="px-5 py-4 text-xs text-neutral-600">{promotion.startsAt ? adminDate(promotion.startsAt) : "فورًا"}<br />إلى {promotion.endsAt ? adminDate(promotion.endsAt) : "دون تاريخ انتهاء"}</td>
                  <td className="px-5 py-4 text-neutral-600">{adminNumber(promotion.redemptionCount)}{promotion.maxRedemptions === null ? " · غير محدود" : ` / ${adminNumber(promotion.maxRedemptions)}`}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${promotion.isActive ? "bg-emerald-50 text-emerald-800" : "bg-neutral-100 text-neutral-600"}`}>{promotion.isActive ? "نشط" : "غير نشط"}</span></td>
                  <td className="px-5 py-4"><ActiveToggle endpoint={`/api/admin/v1/promotions/${promotion.id}`} active={promotion.isActive} /></td>
                </tr>
              ))}
              {promotions.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-neutral-500">لم تتم إضافة عروض بعد.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs leading-5 text-neutral-500">تُدار سجلات العروض هنا، ويطبق إتمام الطلب العروض المدعومة في قواعد التسعير فقط. إنشاء عرض لا يعني بالضرورة تطبيق خصم تلقائي عند الدفع.</p>
    </div>
  );
}
