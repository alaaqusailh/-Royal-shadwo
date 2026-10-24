"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { hasAdminRole } from "@/lib/auth/roles";

export type InventoryAdjustmentState = {
  error?: "validation" | "unauthorized" | "not_found" | "insufficient_stock" | "unavailable";
  success?: string;
};

export async function adjustInventory(
  _previousState: InventoryAdjustmentState,
  formData: FormData,
): Promise<InventoryAdjustmentState> {
  const parsed = z.object({
    inventoryId: z.string().trim().min(1).max(191),
    delta: z.coerce.number().int().min(-10000).max(10000).refine((value) => value !== 0),
    reason: z.string().trim().min(3).max(300),
  }).safeParse({
    inventoryId: formData.get("inventoryId"),
    delta: formData.get("delta"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "validation" };

  const admin = await requireAdmin();
  if (!hasAdminRole(admin.roles, ["SUPER_ADMIN", "PRODUCT_MANAGER"])) {
    return { error: "unauthorized" };
  }

  try {
    const sku = await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { id: parsed.data.inventoryId },
        select: { id: true, variant: { select: { sku: true } } },
      });
      if (!inventory) return null;

      const delta = parsed.data.delta;
      const changed = await tx.inventory.updateMany({
        where: {
          id: inventory.id,
          ...(delta < 0 ? { availableStock: { gte: Math.abs(delta) } } : {}),
        },
        data: {
          availableStock: delta < 0 ? { decrement: Math.abs(delta) } : { increment: delta },
        },
      });
      if (changed.count !== 1) throw new Error("INSUFFICIENT_STOCK");

      await tx.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: "ADJUSTMENT",
          quantity: delta,
          reference: "admin:inventory-adjustment",
          note: parsed.data.reason,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          entityType: "Inventory",
          entityId: inventory.id,
          action: "inventory:adjusted",
          details: { sku: inventory.variant.sku, delta, reason: parsed.data.reason },
        },
      });
      return inventory.variant.sku;
    });

    if (!sku) return { error: "not_found" };
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    return { success: sku };
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") return { error: "insufficient_stock" };
    console.error("Inventory adjustment failed.", error);
    return { error: "unavailable" };
  }
}
