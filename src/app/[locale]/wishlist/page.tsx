import { notFound } from "next/navigation";
import { WishlistView } from "@/components/storefront/wishlist-view";
import { isStorefrontLocale } from "@/lib/utils";

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isStorefrontLocale(locale)) notFound();
  return <WishlistView locale={locale} />;
}
