import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { getShippingPricing } from "@/lib/storefront/shipping";
import { isStorefrontLocale } from "@/lib/utils";

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isStorefrontLocale(locale)) notFound();
  const pricing = await getShippingPricing();
  return <CheckoutForm locale={locale} {...pricing} />;
}
