import { formatPrice } from "@/lib/storefront/format";

const statusLabels: Record<string, string> = {
  PENDING: "قيد الانتظار",
  PAID: "مدفوع",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التوصيل",
  CANCELLED: "ملغي",
  REFUNDED: "مسترد",
  ACTIVE: "نشط",
  INACTIVE: "غير نشط",
  PERCENTAGE: "نسبة مئوية",
  FIXED_AMOUNT: "مبلغ ثابت",
  BUY_X_GET_Y: "اشترِ X واحصل على Y",
  FREE_SHIPPING: "شحن مجاني",
  SUPER_ADMIN: "مدير النظام",
  PRODUCT_MANAGER: "مدير المنتجات",
  ORDER_MANAGER: "مدير الطلبات",
  SUPPORT_AGENT: "خدمة العملاء",
};

export function adminLabel(value: string) {
  return statusLabels[value] ?? value.replaceAll("_", " ");
}

export function adminPrice(value: number) {
  return formatPrice(value, "ar");
}

export function adminNumber(value: number) {
  return value.toLocaleString("ar-SA");
}

export function adminDate(value: Date, withTime = false) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(value);
}

export function adminRangeSummary(
  page: number,
  pageSize: number,
  total: number,
  noun: string,
) {
  if (total === 0) return `لا توجد ${noun}`;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return `عرض ${adminNumber(start)}–${adminNumber(end)} من ${adminNumber(total)}`;
}
