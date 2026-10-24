import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

const contentRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER"] as const;
const statusSchema = z.object({ isActive: z.boolean() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiAdmin(contentRoles);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id || id.length > 191) return apiError(400, "INVALID_ID", "A valid promotion id is required.");
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = statusSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const changed = await tx.promotion.updateMany({
        where: { id },
        data: { isActive: parsed.data.isActive },
      });
      if (changed.count !== 1) return null;

      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          entityType: "Promotion",
          entityId: id,
          action: parsed.data.isActive ? "promotion:activated" : "promotion:deactivated",
        },
      });
      return tx.promotion.findUnique({ where: { id }, select: { id: true, isActive: true } });
    });
    return result
      ? Response.json({ data: result })
      : apiError(404, "NOT_FOUND", "Promotion not found.");
  } catch (error) {
    console.error("Admin promotion status update failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Promotion status could not be updated.");
  }
}
