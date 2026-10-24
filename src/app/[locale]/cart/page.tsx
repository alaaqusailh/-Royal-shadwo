import { notFound } from "next/navigation";
import { CartView } from "@/components/storefront/cart-view";
import { getShippingPricing } from "@/lib/storefront/shipping";
import { isStorefrontLocale } from "@/lib/utils";

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isStorefrontLocale(locale)) notFound();
  const pricing = await getShippingPricing();
  return <CartView locale={locale} {...pricing} />;
}
