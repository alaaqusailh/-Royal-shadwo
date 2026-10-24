import { notFound } from "next/navigation";
import { InfoPage } from "@/components/storefront/info-page";
import { getCopy } from "@/lib/storefront/copy";
import { formatPrice } from "@/lib/storefront/format";
import { getShippingPricing } from "@/lib/storefront/shipping";
import { isStorefrontLocale } from "@/lib/utils";

export default async function ShippingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isStorefrontLocale(locale)) notFound();
  const copy = getCopy(locale);
  const pricing = await getShippingPricing();
  const bodyOverride = locale === "ar"
    ? `يستغرق التوصيل المعتاد عادةً من يومين إلى خمسة أيام عمل بعد الإرسال. يتوفر التوصيل المجاني للطلبات التي تبلغ ${formatPrice(pricing.freeShippingThreshold, locale)} فأكثر، وتُضاف رسوم قدرها ${formatPrice(pricing.shippingFee, locale)} لما دون ذلك. قد تختلف المدة حسب المدينة والمواسم.`
    : `Standard delivery usually takes 2–5 business days after dispatch. Complimentary delivery is available on orders of ${formatPrice(pricing.freeShippingThreshold, locale)} or more; a ${formatPrice(pricing.shippingFee, locale)} delivery fee applies below that amount. Delivery times may vary by location and during seasonal periods.`;
  return <InfoPage locale={locale} kind="shipping" copy={copy} bodyOverride={bodyOverride} />;
}
