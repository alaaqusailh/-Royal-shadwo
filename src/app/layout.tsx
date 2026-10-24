import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat, Tajawal } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const arabic = Tajawal({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name.ar} ${BRAND.descriptor.ar} | ${BRAND.name.en}`,
    template: `%s | ${BRAND.name.ar}`,
  },
  description: "عبايات بتفاصيل ملكية وأناقة هادئة، مع تجربة تسوق سهلة داخل المملكة. Refined abayas with quiet elegance and an effortless shopping experience across Saudi Arabia.",
  applicationName: BRAND.name.en,
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: BRAND.name.en,
    title: `${BRAND.name.ar} ${BRAND.descriptor.ar} | ${BRAND.name.en}`,
    description: "اكتشفي عبايات الظل الملكي بتفاصيل راقية.",
    images: [{ url: BRAND.socialImage, width: 1200, height: 630, alt: `${BRAND.name.ar} ${BRAND.descriptor.ar}` }],
  },
  twitter: {
    card: "summary_large_image",
    images: [BRAND.socialImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${montserrat.variable} ${cormorant.variable} ${arabic.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-[#faf7f2] text-[#1a1a1a]">{children}</body>
    </html>
  );
}
