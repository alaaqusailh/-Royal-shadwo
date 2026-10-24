import Link from "next/link";
import { BrandMark } from "@/components/storefront/brand-mark";
import { getCopy } from "@/lib/storefront/copy";
import { prisma } from "@/lib/db";
import type { StorefrontLocale } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export async function StorefrontFooter({
  locale,
  categories,
}: {
  locale: StorefrontLocale;
  categories: Array<{ name: string; nameAr: string | null; slug: string }>;
}) {
  const copy = getCopy(locale);
  const support = await prisma.storeSetting.findUnique({
    where: { key: "store.supportEmail" },
    select: { value: true },
  });
  const supportEmail = support?.value.trim();

  return (
    <footer className="mt-20 bg-[#0d0d0d] text-white">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 sm:py-16 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-12">
        <div>
          <Link href={`/${locale}`} className="inline-flex overflow-hidden">
            <BrandMark />
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-7 text-white/55">{copy.footer.note}</p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[#c8a96c]">{copy.footer.location} · SAR</p>
        </div>

        <div>
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#c8a96c]">{copy.footer.explore}</h2>
          <ul className="space-y-3 text-sm text-white/65">
            <li><Link className="footer-link" href={`/${locale}/products`}>{copy.nav.shop}</Link></li>
            {categories.slice(0, 2).map((category) => (
              <li key={category.slug}>
                <Link className="footer-link" href={`/${locale}/categories/${category.slug}`}>
                  {locale === "ar" ? category.nameAr ?? category.name : category.name}
                </Link>
              </li>
            ))}
            <li><Link className="footer-link" href={`/${locale}/about`}>{copy.footer.about}</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#c8a96c]">{copy.footer.care}</h2>
          <ul className="space-y-3 text-sm text-white/65">
            <li><Link className="footer-link" href={`/${locale}/contact`}>{copy.footer.contact}</Link></li>
            <li><Link className="footer-link" href={`/${locale}/shipping`}>{copy.footer.shipping}</Link></li>
            <li><Link className="footer-link" href={`/${locale}/returns`}>{copy.footer.returns}</Link></li>
            {supportEmail && <li><a className="footer-link" href={`mailto:${supportEmail}`}>{supportEmail}</a></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 text-[10px] tracking-[0.08em] text-white/40 sm:flex-row">
          <span>© {new Date().getFullYear()} {BRAND.name[locale]} · {copy.footer.rights}</span>
          <span>{BRAND.name.en.toUpperCase()} {BRAND.descriptor.en}</span>
        </div>
      </div>
    </footer>
  );
}
