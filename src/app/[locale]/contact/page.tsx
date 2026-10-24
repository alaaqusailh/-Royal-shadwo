import { notFound } from "next/navigation";
import { InfoPage } from "@/components/storefront/info-page";
import { getCopy } from "@/lib/storefront/copy";
import { prisma } from "@/lib/db";
import { isStorefrontLocale } from "@/lib/utils";

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isStorefrontLocale(locale)) notFound();
  const copy = getCopy(locale);
  const settings = await prisma.storeSetting.findMany({
    where: { key: { in: ["store.supportEmail", "store.supportPhone"] } },
    select: { key: true, value: true },
  });
  const values = new Map(settings.map((setting) => [setting.key, setting.value.trim()]));
  return (
    <InfoPage
      locale={locale}
      kind="contact"
      copy={copy}
      contactEmail={values.get("store.supportEmail")}
      contactPhone={values.get("store.supportPhone")}
    />
  );
}
