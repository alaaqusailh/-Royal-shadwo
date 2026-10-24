import Image from "next/image";
import { BRAND } from "@/lib/brand";

export function BrandMark({
  compact = false,
  compactOnMobile = false,
}: {
  compact?: boolean;
  compactOnMobile?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center ${compact ? "justify-center" : "gap-3"}`}
    >
      <Image
        src={BRAND.logo}
        alt=""
        width={48}
        height={48}
        className={`shrink-0 border border-[#c8a96c]/60 object-cover ${compact ? "h-11 w-11" : compactOnMobile ? "h-10 w-10 sm:h-12 sm:w-12" : "h-12 w-12"}`}
      />
      {!compact && (
        <span className={`flex flex-col leading-none ${compactOnMobile ? "hidden sm:flex" : ""}`}>
          <span className="font-arabic text-lg font-semibold tracking-normal text-white">{BRAND.name.ar} {BRAND.descriptor.ar}</span>
          <span className="mt-1.5 font-display text-xs tracking-[0.24em] text-[#c8a96c]">{BRAND.name.en.toUpperCase()} {BRAND.descriptor.en}</span>
        </span>
      )}
    </span>
  );
}
