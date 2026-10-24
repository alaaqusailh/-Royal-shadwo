import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { adminPrice } from "@/lib/admin/localization";

export default async function AdminSettingsPage() {
  await requireAdmin(["SUPER_ADMIN"]);
  const settings = await prisma.storeSetting.findMany({
    where: { key: { in: ["store.name", "store.currency", "store.vatRate", "store.defaultShippingFee", "store.freeShippingThreshold", "store.defaultLocale", "store.arEnabled", "store.supportEmail", "store.supportPhone"] } },
    select: { key: true, value: true },
  });
  const values = new Map(settings.map((setting) => [setting.key, setting.value]));
  const vatRate = Number(values.get("store.vatRate"));
  const shipping = Number(values.get("store.defaultShippingFee"));
  const freeShippingThreshold = Number(values.get("store.freeShippingThreshold"));
  const arabicEnabled = values.get("store.arEnabled") === "true";

  const rows = [
    ["اسم المتجر", values.get("store.name") ?? "غير مهيأ"],
    ["العملة", values.get("store.currency") ?? "غير مهيأ"],
    ["ضريبة القيمة المضافة", Number.isFinite(vatRate) ? `${(vatRate * 100).toLocaleString("ar-SA")}٪` : "غير مهيأ"],
    ["رسوم الشحن الافتراضية", Number.isFinite(shipping) ? adminPrice(shipping) : "غير مهيأ"],
    ["حد الشحن المجاني", Number.isFinite(freeShippingThreshold) ? adminPrice(freeShippingThreshold) : "غير مهيأ"],
    ["اللغة الافتراضية", values.get("store.defaultLocale") === "ar" ? "العربية" : values.get("store.defaultLocale") === "en" ? "الإنجليزية" : values.get("store.defaultLocale") ?? "غير مهيأ"],
    ["اللغة العربية مفعلة", arabicEnabled ? "نعم" : "لا"],
    ["بريد الدعم", values.get("store.supportEmail") || "غير مهيأ"],
    ["هاتف الدعم", values.get("store.supportPhone") || "غير مهيأ"],
  ];

  return (
    <div className="space-y-6">
      <div><p className="text-xs text-neutral-500">إعدادات النظام</p><h2 className="mt-2 text-3xl font-semibold">إعدادات المتجر</h2></div>
      <Card className="max-w-3xl p-5 sm:p-7">
        <dl className="divide-y divide-neutral-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-2 py-4 text-sm">
              <dt className="text-neutral-500">{label}</dt><dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 border-t border-neutral-100 pt-5 text-xs leading-5 text-neutral-500">لا تُعرض بيانات الدفع وإعدادات بوابات الإنتاج هنا لحمايتها. لا يوجد مزود دفع مباشر متصل حاليًا.</p>
      </Card>
    </div>
  );
}
