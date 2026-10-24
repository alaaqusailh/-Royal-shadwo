import type { StorefrontLocale } from "@/lib/utils";

export function formatPrice(amount: number, locale: StorefrontLocale) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(amount);
}
