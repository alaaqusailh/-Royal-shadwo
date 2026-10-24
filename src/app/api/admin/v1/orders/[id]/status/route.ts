import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

const orderRoles = ["SUPER_ADMIN", "ORDER_MANAGER"] as const;
const statusSchema = z.object({
  status: z.enum(["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

class InvalidTransitionError extends Error {}
class PaymentNotVerifiedError extends Error {}
class StockReleaseError extends Error {}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiAdmin(orderRoles);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id || id.length > 191) return apiError(400, "INVALID_ID", "A valid order id is required.");
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = statusSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          currency: true,
          items: { select: { variantId: true, quantity: true } },
          payments: { select: { status: true, amount: true, currency: true } },
        },
      });
      if (!order) return { error: "NOT_FOUND" as const };

      const nextStatus = parsed.data.status;
      const allowedTransition =
        (order.status === "PENDING" && (nextStatus === "PAID" || nextStatus === "CANCELLED")) ||
        (order.status === "PAID" && nextStatus === "PROCESSING") ||
        (order.status === "PROCESSING" && nextStatus === "SHIPPED") ||
        (order.status === "SHIPPED" && nextStatus === "DELIVERED");
      if (!allowedTransition) throw new InvalidTransitionError();

      if (nextStatus === "PAID") {
        const verifiedPayment = order.payments.some((payment) =>
          payment.status === "CAPTURED" &&
          payment.currency === order.currency &&
          payment.amount.equals(order.total),
        );
        if (!verifiedPayment) throw new PaymentNotVerifiedError();
      }

      if (nextStatus === "CANCELLED") {
        for (const item of order.items) {
          if (!item.variantId) continue;
          const inventory = await tx.inventory.findUnique({
            where: { variantId: item.variantId },
            select: { id: true },
          });
          if (!inventory) throw new StockReleaseError();
          const released = await tx.inventory.updateMany({
            where: { id: inventory.id, reservedStock: { gte: item.quantity } },
            data: {
              reservedStock: { decrement: item.quantity },
              availableStock: { increment: item.quantity },
            },
          });
          if (released.count !== 1) throw new StockReleaseError();
          await tx.inventoryMovement.create({
            data: {
              inventoryId: inventory.id,
              type: "RESERVATION_RELEASE",
              quantity: item.quantity,
              reference: order.orderNumber,
              note: "Stock released after a pending order was cancelled through the admin API.",
            },
          });
        }
      }

      const updated = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: nextStatus },
      });
      if (updated.count !== 1) throw new InvalidTransitionError();

      if (nextStatus === "CANCELLED") {
        await tx.payment.updateMany({
          where: { orderId: order.id, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          entityType: "Order",
          entityId: order.id,
          action: "order:status_changed",
          details: { orderNumber: order.orderNumber, from: order.status, to: nextStatus },
        },
      });

      return { id: order.id, orderNumber: order.orderNumber, status: nextStatus };
    });

    if ("error" in result) return apiError(404, "NOT_FOUND", "Order not found.");
    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof InvalidTransitionError) {
      return apiError(409, "INVALID_STATUS_TRANSITION", "The requested order status transition is not allowed.");
    }
    if (error instanceof PaymentNotVerifiedError) {
      return apiError(409, "PAYMENT_NOT_VERIFIED", "An order can only be marked paid after a matching captured payment exists.");
    }
    if (error instanceof StockReleaseError) {
      return apiError(409, "STOCK_RESERVATION_MISMATCH", "The order reservation could not be released safely.");
    }
    console.error("Admin order status update failed.", error);
    return apiError(500, "INTERNAL_ERROR", "The order status could not be updated.");
  }
}
