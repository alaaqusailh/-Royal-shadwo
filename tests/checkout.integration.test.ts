import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { placeOrder } from "../src/app/[locale]/checkout/actions";
import { prisma } from "../src/lib/db";

test("guest checkout creates a pending order and reserves inventory atomically", async () => {
  let orderNumber: string | undefined;
  const fixture: {
    categoryId?: string;
    sizeId?: string;
    colorId?: string;
    productId?: string;
  } = {};

  try {
    const suffix = randomUUID();
    const category = await prisma.category.create({
      data: { name: `Checkout test ${suffix}`, slug: `checkout-test-${suffix}` },
      select: { id: true },
    });
    fixture.categoryId = category.id;
    const size = await prisma.size.create({
      data: { code: `T${suffix.slice(0, 12)}`, label: "Test size" },
      select: { id: true },
    });
    fixture.sizeId = size.id;
    const color = await prisma.color.create({
      data: { code: `t${suffix.slice(0, 12)}`, name: "Test color", hex: "#000000" },
      select: { id: true },
    });
    fixture.colorId = color.id;
    const product = await prisma.product.create({
      data: {
        name: "Checkout test product",
        slug: `checkout-test-${suffix}`,
        description: "Temporary integration fixture.",
        categoryId: category.id,
        basePrice: "249.00",
        isPublished: true,
        publishedAt: new Date(),
      },
      select: { id: true },
    });
    fixture.productId = product.id;
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sizeId: size.id,
        colorId: color.id,
        sku: `CHECKOUT-TEST-${suffix}`,
        price: "249.00",
      },
      select: { id: true },
    });
    await prisma.inventory.create({ data: { variantId: variant.id, availableStock: 12 } });
    const purchasableVariant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
      select: { id: true, inventory: { select: { availableStock: true, reservedStock: true } } },
    });
    assert.ok(purchasableVariant.inventory, "The temporary variant must have an inventory record.");
    const stockBefore = purchasableVariant.inventory;
    assert.ok(stockBefore.availableStock >= 3, "The integration variant needs three available units.");

    const email = `checkout-${randomUUID()}@example.com`;
    const formData = new FormData();
    formData.set("locale", "en");
    formData.set("name", "Integration Test");
    formData.set("email", email);
    formData.set("phone", "0551234567");
    formData.set("city", "Riyadh");
    formData.set("district", "Al Olaya");
    formData.set("street", "King Fahd Road 12");
    formData.set("postalCode", "12211");
    formData.set("items", JSON.stringify([{ variantId: purchasableVariant.id, quantity: 3 }]));

    const result = await placeOrder({}, formData);
    assert.ok(result.orderNumber, `Checkout action returned ${result.error ?? "no order number"}.`);
    orderNumber = result.orderNumber;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { payments: true, items: true },
    });
    assert.ok(order, "The pending order should be persisted.");
    assert.equal(order.status, "PENDING");
    assert.equal(order.currency, "SAR");
    assert.equal(order.payments.length, 1);
    assert.equal(order.payments[0].status, "PENDING");
    assert.equal(order.payments[0].provider, "sandbox");
    assert.equal(order.items.length, 1);
    assert.equal(order.discountAmount.toNumber(), 0);
    assert.equal(order.items[0].totalPrice.toNumber(), 747);
    assert.equal(JSON.stringify(order.shippingAddress).includes(email), true);

    const stockAfter = await prisma.inventory.findUniqueOrThrow({
      where: { variantId: purchasableVariant.id },
      select: { availableStock: true, reservedStock: true },
    });
    assert.equal(stockAfter.availableStock, stockBefore.availableStock - 3);
    assert.equal(stockAfter.reservedStock, stockBefore.reservedStock + 3);
  } finally {
    if (orderNumber) {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { orderNumber },
          select: { id: true, status: true, items: { select: { variantId: true, quantity: true } } },
        });
        if (!order) return;

        if (order.status === "PENDING") {
          for (const item of order.items) {
            if (!item.variantId) continue;
            const inventory = await tx.inventory.findUnique({
              where: { variantId: item.variantId },
              select: { id: true },
            });
            if (!inventory) continue;
            const restored = await tx.inventory.updateMany({
              where: { id: inventory.id, reservedStock: { gte: item.quantity } },
              data: {
                availableStock: { increment: item.quantity },
                reservedStock: { decrement: item.quantity },
              },
            });
            assert.equal(restored.count, 1, "The test reservation should be restored during cleanup.");
          }
        }

        await tx.inventoryMovement.deleteMany({ where: { reference: orderNumber } });
        await tx.auditLog.deleteMany({ where: { entityId: order.id, action: "order:created_pending_payment" } });
        await tx.order.delete({ where: { id: order.id } });
      });
    }
    await prisma.$transaction(async (tx) => {
      if (fixture.productId) await tx.product.deleteMany({ where: { id: fixture.productId } });
      if (fixture.categoryId) await tx.category.deleteMany({ where: { id: fixture.categoryId } });
      if (fixture.sizeId) await tx.size.deleteMany({ where: { id: fixture.sizeId } });
      if (fixture.colorId) await tx.color.deleteMany({ where: { id: fixture.colorId } });
    });
    await prisma.$disconnect();
  }
});
