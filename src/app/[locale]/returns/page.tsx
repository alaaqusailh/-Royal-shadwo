import { notFound } from "next/navigation";
import { InfoPage } from "@/components/storefront/info-page";
import { getCopy } from "@/lib/storefront/copy";
import { isStorefrontLocale } from "@/lib/utils";

export default async function ReturnsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isStorefrontLocale(locale)) notFound();
  return <InfoPage locale={locale} kind="returns" copy={getCopy(locale)} />;
}
