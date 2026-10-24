"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { hasAdminRole } from "@/lib/auth/roles";

export type CancelOrderState = {
  error?: "validation" | "unauthorized" | "not_pending" | "reservation" | "unavailable";
  success?: string;
};

class OrderStateError extends Error {}
class ReservationReleaseError extends Error {}

export async function cancelPendingOrder(
  _previousState: CancelOrderState,
  formData: FormData,
): Promise<CancelOrderState> {
  const parsedId = z.string().trim().min(1).max(191).safeParse(formData.get("orderId"));
  if (!parsedId.success) return { error: "validation" };

  const admin = await requireAdmin();
  if (!hasAdminRole(admin.roles, ["SUPER_ADMIN", "ORDER_MANAGER"])) {
    return { error: "unauthorized" };
  }

  try {
    const orderNumber = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: parsedId.data },
        select: { id: true, orderNumber: true, status: true, items: { select: { variantId: true, quantity: true } } },
      });
      if (!order || order.status !== "PENDING") throw new OrderStateError("Only pending orders can be cancelled.");

      for (const item of order.items) {
        if (!item.variantId) continue;
        const inventory = await tx.inventory.findUnique({
          where: { variantId: item.variantId },
          select: { id: true },
        });
        if (!inventory) throw new ReservationReleaseError("The reserved stock record is unavailable.");

        const released = await tx.inventory.updateMany({
          where: { id: inventory.id, reservedStock: { gte: item.quantity } },
          data: {
            reservedStock: { decrement: item.quantity },
            availableStock: { increment: item.quantity },
          },
        });
        if (released.count !== 1) throw new ReservationReleaseError("The reserved quantity could not be released.");

        await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            type: "RESERVATION_RELEASE",
            quantity: item.quantity,
            reference: order.orderNumber,
            note: "Stock released after a pending order was cancelled.",
          },
        });
      }

      const updated = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      if (updated.count !== 1) throw new OrderStateError("The order status changed before cancellation completed.");

      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          entityType: "Order",
          entityId: order.id,
          action: "order:cancelled_and_reservation_released",
          details: { orderNumber: order.orderNumber },
        },
      });
      return order.orderNumber;
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { success: orderNumber };
  } catch (error) {
    if (error instanceof OrderStateError) return { error: "not_pending" };
    if (error instanceof ReservationReleaseError) return { error: "reservation" };
    console.error("The pending order could not be cancelled.", error);
    return { error: "unavailable" };
  }
}
