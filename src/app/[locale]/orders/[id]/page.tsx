import Link from "next/link";
import { notFound } from "next/navigation";
import { getCopy } from "@/lib/storefront/copy";
import { isStorefrontLocale } from "@/lib/utils";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await params;
  if (!isStorefrontLocale(locale)) notFound();
  const copy = getCopy(locale);

  return (
    <div className="mx-auto min-h-[65vh] max-w-[820px] px-5 py-16 sm:px-8 sm:py-24">
      <p className="eyebrow">{copy.orders.title}</p>
      <p className="mt-5 border border-[#e5ded2] bg-white p-5 text-sm leading-7 text-[#6e655a] sm:p-7">{copy.orders.unavailable}</p>
      <Link href={`/${locale}/contact`} className="section-link mt-7">{copy.orders.contact}</Link>
    </div>
  );
}
