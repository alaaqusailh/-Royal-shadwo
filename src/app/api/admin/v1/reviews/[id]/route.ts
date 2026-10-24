import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

const reviewRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER", "SUPPORT_AGENT"] as const;
const statusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiAdmin(reviewRoles);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!id || id.length > 191) return apiError(400, "INVALID_ID", "A valid review id is required.");
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = statusSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const review = await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({ where: { id }, select: { id: true, status: true } });
      if (!existing) return null;
      const updated = await tx.review.update({
        where: { id },
        data: { status: parsed.data.status, moderatedAt: new Date() },
        select: { id: true, status: true },
      });
      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          entityType: "Review",
          entityId: id,
          action: "review:moderated",
          details: { from: existing.status, to: parsed.data.status },
        },
      });
      return updated;
    });
    return review ? Response.json({ data: review }) : apiError(404, "NOT_FOUND", "Review not found.");
  } catch (error) {
    console.error("Admin review moderation failed.", error);
    return apiError(500, "INTERNAL_ERROR", "The review could not be moderated.");
  }
}
