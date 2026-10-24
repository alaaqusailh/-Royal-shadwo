"use server";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { checkoutOrderSchema } from "@/lib/validation/store";

export type CheckoutState = {
  error?: "validation" | "unavailable" | "stock";
  orderNumber?: string;
};

class StockReservationError extends Error {}

function settingValue(settings: Map<string, string>, key: string) {
  const value = settings.get(key);
  if (value === undefined) {
    throw new Error(`Required store setting "${key}" is missing.`);
  }
  return value;
}

function moneyToCents(value: string, key: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100_000_000) {
    throw new Error(`Store setting "${key}" must be a non-negative money amount.`);
  }
  return Math.round(parsed * 100);
}

export async function placeOrder(_previousState: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const rawItems = formData.get("items");
  if (typeof rawItems !== "string") return { error: "validation" };

  let itemsValue: unknown;
  try {
    itemsValue = JSON.parse(rawItems);
  } catch {
    return { error: "validation" };
  }

  const parsed = checkoutOrderSchema.safeParse({
    locale: formData.get("locale"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    district: formData.get("district") ?? "",
    street: formData.get("street"),
    postalCode: formData.get("postalCode") ?? "",
    items: itemsValue,
  });

  if (!parsed.success) return { error: "validation" };

  const quantityByVariant = new Map<string, number>();
  for (const item of parsed.data.items) {
    const quantity = (quantityByVariant.get(item.variantId) ?? 0) + item.quantity;
    if (quantity > 10) return { error: "validation" };
    quantityByVariant.set(item.variantId, quantity);
  }
  const requestedItems = Array.from(quantityByVariant, ([variantId, quantity]) => ({ variantId, quantity }));
  const variantIds = requestedItems.map((item) => item.variantId);
  const paymentProvider = process.env.PAYMENT_PROVIDER;

  if (paymentProvider !== "sandbox") {
    throw new Error("Only the sandbox payment provider is configured for checkout.");
  }

  try {
    const orderNumber = `AS-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;

    await prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: {
          id: { in: variantIds },
          isActive: true,
          product: { isPublished: true },
        },
        include: {
          product: true,
          size: true,
          color: true,
          inventory: true,
        },
      });

      if (variants.length !== requestedItems.length) {
        throw new StockReservationError("A selected product is no longer available.");
      }

      const settingsRows = await tx.storeSetting.findMany({
        where: { key: { in: ["store.vatRate", "store.defaultShippingFee", "store.freeShippingThreshold"] } },
        select: { key: true, value: true },
      });
      const settings = new Map(settingsRows.map((setting) => [setting.key, setting.value]));
      const vatRate = Number(settingValue(settings, "store.vatRate"));
      if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 1) {
        throw new Error('Store setting "store.vatRate" must be between 0 and 1.');
      }
      const shippingCents = moneyToCents(settingValue(settings, "store.defaultShippingFee"), "store.defaultShippingFee");
      const freeShippingThresholdCents = moneyToCents(
        settingValue(settings, "store.freeShippingThreshold"),
        "store.freeShippingThreshold",
      );

      let subtotalCents = 0;
      const orderItems = requestedItems.map((requested) => {
        const variant = variants.find((candidate) => candidate.id === requested.variantId);
        if (!variant || !variant.inventory || variant.inventory.availableStock < requested.quantity) {
          throw new StockReservationError("A selected product is out of stock.");
        }

        const unitCents = Math.round(variant.price.toNumber() * 100);
        subtotalCents += unitCents * requested.quantity;
        return {
          variant,
          quantity: requested.quantity,
          unitCents,
          unitPrice: (unitCents / 100).toFixed(2),
        };
      });

      const discountCents = 0;
      const discountedSubtotalCents = subtotalCents;
      const shippingFeeCents = discountedSubtotalCents >= freeShippingThresholdCents ? 0 : shippingCents;
      const vatCents = Math.round(((discountedSubtotalCents + shippingFeeCents) * vatRate) / (1 + vatRate));
      const totalCents = discountedSubtotalCents + shippingFeeCents;

      for (const item of orderItems) {
        const inventoryId = item.variant.inventory?.id;
        if (!inventoryId) throw new StockReservationError("A selected product has no available stock record.");

        const reservation = await tx.inventory.updateMany({
          where: { id: inventoryId, availableStock: { gte: item.quantity } },
          data: {
            availableStock: { decrement: item.quantity },
            reservedStock: { increment: item.quantity },
          },
        });

        if (reservation.count !== 1) {
          throw new StockReservationError("The selected quantity is no longer available.");
        }

        await tx.inventoryMovement.create({
          data: {
            inventoryId,
            type: "RESERVATION",
            quantity: -item.quantity,
            reference: orderNumber,
            note: "Stock reserved for a pending checkout.",
          },
        });
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          status: "PENDING",
          currency: "SAR",
          subtotal: (subtotalCents / 100).toFixed(2),
          discountAmount: (discountCents / 100).toFixed(2),
          shippingFee: (shippingFeeCents / 100).toFixed(2),
          vatAmount: (vatCents / 100).toFixed(2),
          total: (totalCents / 100).toFixed(2),
          shippingAddress: {
            name: parsed.data.name,
            email: parsed.data.email,
            phone: parsed.data.phone,
            country: "Saudi Arabia",
            city: parsed.data.city,
            district: parsed.data.district,
            street: parsed.data.street,
            postalCode: parsed.data.postalCode,
          },
          items: {
            create: orderItems.map((item) => ({
              variantId: item.variant.id,
              productName: parsed.data.locale === "ar"
                ? item.variant.product.nameAr ?? item.variant.product.name
                : item.variant.product.name,
              variantLabel: `${item.variant.size.label} · ${
                parsed.data.locale === "ar"
                  ? item.variant.color.nameAr ?? item.variant.color.name
                  : item.variant.color.name
              }`,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: ((item.unitCents * item.quantity) / 100).toFixed(2),
            })),
          },
          payments: {
            create: {
              provider: paymentProvider,
              status: "PENDING",
              amount: (totalCents / 100).toFixed(2),
              currency: "SAR",
            },
          },
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          entityType: "Order",
          entityId: order.id,
          action: "order:created_pending_payment",
          details: { orderNumber, provider: paymentProvider },
        },
      });
    });

    return { orderNumber };
  } catch (error) {
    if (error instanceof StockReservationError) return { error: "stock" };
    console.error("Checkout could not create a pending order.", error);
    return { error: "unavailable" };
  }
}
