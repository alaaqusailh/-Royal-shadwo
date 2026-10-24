import { z } from "zod";
import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { linkUrlSchema } from "@/lib/api/validation";
import { prisma } from "@/lib/db";

const contentRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER"] as const;
const updateSectionSchema = z.object({
  isActive: z.boolean().optional(),
  linkUrl: z.union([linkUrlSchema, z.literal("")]).nullable().optional(),
}).refine((value) => value.isActive !== undefined || value.linkUrl !== undefined, {
  message: "At least one section field must be provided.",
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiAdmin(contentRoles);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id || id.length > 191) return apiError(400, "INVALID_ID", "A valid section id is required.");
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = updateSectionSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.homeSection.updateMany({
        where: { id },
        data: {
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
          ...(parsed.data.linkUrl !== undefined ? { linkUrl: parsed.data.linkUrl || null } : {}),
        },
      });
      if (changed.count !== 1) return null;

      await tx.auditLog.create({
        data: {
          userId: auth.userId,
          entityType: "HomeSection",
          entityId: id,
          action: parsed.data.linkUrl !== undefined
            ? "home_section:link_updated"
            : parsed.data.isActive
              ? "home_section:activated"
              : "home_section:deactivated",
          details: parsed.data.linkUrl !== undefined
            ? { linkConfigured: Boolean(parsed.data.linkUrl) }
            : undefined,
        },
      });
      return tx.homeSection.findUnique({ where: { id }, select: { id: true, isActive: true, linkUrl: true } });
    });
    return updated
      ? Response.json({ data: updated })
      : apiError(404, "NOT_FOUND", "Homepage section not found.");
  } catch (error) {
    console.error("Admin homepage section update failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Homepage section could not be updated.");
  }
}
