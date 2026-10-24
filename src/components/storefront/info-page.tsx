import Link from "next/link";
import { ArrowUpLeft, Mail, MapPin, Phone } from "lucide-react";
import type { getCopy } from "@/lib/storefront/copy";
import type { StorefrontLocale } from "@/lib/utils";

type PageKind = "about" | "contact" | "shipping" | "returns";
type Copy = ReturnType<typeof getCopy>;

export function InfoPage({
  locale,
  kind,
  copy,
  bodyOverride,
  contactEmail,
  contactPhone,
}: {
  locale: StorefrontLocale;
  kind: PageKind;
  copy: Copy;
  bodyOverride?: string;
  contactEmail?: string;
  contactPhone?: string;
}) {
  const content = copy.pages[kind];
  const isArabic = locale === "ar";

  return (
    <div lang={locale} dir={isArabic ? "rtl" : "ltr"} className="mx-auto max-w-[1120px] px-5 py-12 sm:px-8 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
        <div className="relative flex min-h-[300px] items-end overflow-hidden bg-[#0d0d0d] p-7 sm:min-h-[440px] sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_65%_15%,rgba(200,169,108,.25),transparent_45%)]" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#c8a96c]">{content.eyebrow}</p>
            <h1 className="mt-5 whitespace-pre-line font-display text-5xl font-medium leading-tight text-[#f2e8d9] sm:text-6xl">{content.title}</h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/60">{content.intro}</p>
          </div>
          <span className="absolute end-6 top-6 font-display text-5xl text-[#c8a96c]/60">ع</span>
        </div>
        <div className="self-center py-3">
          {kind === "contact" ? (
            <>
              <p className="eyebrow">{content.heading}</p>
              <h2 className="mt-4 font-display text-4xl font-medium sm:text-5xl">{content.heading}</h2>
              <p className="mt-5 text-sm leading-8 text-[#71685e]">{bodyOverride ?? content.body}</p>
              <div className="mt-8 space-y-4 border-t border-[#e4ddd2] pt-6 text-sm">
                {contactEmail && <a href={`mailto:${contactEmail}`} className="flex items-center gap-3 text-[#4d453c] transition hover:text-[#92784b]"><Mail size={17} className="text-[#9a7c49]" /> {contactEmail}</a>}
                {contactPhone && <a href={`tel:${contactPhone}`} className="flex items-center gap-3 text-[#4d453c] transition hover:text-[#92784b]"><Phone size={17} className="text-[#9a7c49]" /> {contactPhone}</a>}
                <p className="flex items-center gap-3 text-[#4d453c]"><MapPin size={17} className="text-[#9a7c49]" /> {copy.footer.location}</p>
                {!contactEmail && !contactPhone && <p role="status" className="text-sm leading-6 text-[#81786c]">{copy.pages.contact.contactUnavailable}</p>}
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">{content.eyebrow}</p>
              <h2 className="mt-4 font-display text-4xl font-medium sm:text-5xl">{content.heading}</h2>
              <p className="mt-5 text-sm leading-8 text-[#71685e]">{content.body}</p>
              {kind === "about" && <p className="mt-5 font-display text-2xl text-[#9a7c49]">{copy.pages.about.close}</p>}
              <Link href={`/${locale}/contact`} className="section-link mt-8">
                {copy.footer.contact}
                {isArabic ? <ArrowUpLeft size={14} className="-rotate-45" /> : <ArrowUpLeft size={14} className="rotate-45" />}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
