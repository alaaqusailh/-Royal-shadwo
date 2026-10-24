import "server-only";
import { prisma } from "@/lib/db";

export async function getShippingPricing() {
  const settings = await prisma.storeSetting.findMany({
    where: { key: { in: ["store.defaultShippingFee", "store.freeShippingThreshold"] } },
    select: { key: true, value: true },
  });
  const values = new Map(settings.map((setting) => [setting.key, Number(setting.value)]));
  const shippingFee = values.get("store.defaultShippingFee");
  const freeShippingThreshold = values.get("store.freeShippingThreshold");

  if (
    shippingFee === undefined || freeShippingThreshold === undefined ||
    !Number.isFinite(shippingFee) || shippingFee < 0 ||
    !Number.isFinite(freeShippingThreshold) || freeShippingThreshold < 0
  ) {
    throw new Error("Valid checkout shipping settings must be configured in the store settings.");
  }

  return { shippingFee, freeShippingThreshold };
}
