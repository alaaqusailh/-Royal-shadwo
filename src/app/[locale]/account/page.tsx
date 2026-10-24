import Link from "next/link";
import { notFound } from "next/navigation";
import { getCopy } from "@/lib/storefront/copy";
import { isStorefrontLocale } from "@/lib/utils";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isStorefrontLocale(locale)) notFound();
  const copy = getCopy(locale);

  return (
    <div className="mx-auto min-h-[65vh] max-w-[820px] px-5 py-16 sm:px-8 sm:py-24">
      <p className="eyebrow">{copy.nav.account}</p>
      <h1 className="mt-3 font-display text-4xl font-medium sm:text-6xl">{copy.account.title}</h1>
      <p className="mt-4 text-sm text-[#756b60]">{copy.account.intro}</p>
      <div role="status" className="mt-8 border border-[#e5ded2] bg-white p-5 text-sm leading-7 text-[#6e655a] sm:p-7">
        {copy.account.unavailable}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/${locale}/orders`} className="section-link">{copy.account.ordersLink}</Link>
        <Link href={`/${locale}/wishlist`} className="section-link">{copy.nav.wishlist}</Link>
      </div>
    </div>
  );
}
