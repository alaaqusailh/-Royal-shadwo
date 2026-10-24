import "server-only";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/api/http";

export async function authorizeApiAdmin(allowedRoles: readonly string[]) {
  try {
    const session = await getCurrentSession();
    const email = session?.user?.email;
    if (!email) {
      return { ok: false as const, response: apiError(401, "UNAUTHENTICATED", "Admin authentication is required.") };
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isActive: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    const roleNames = user?.roles.map(({ role }) => role.name) ?? [];
    if (!user?.isActive || !roleNames.some((role) => allowedRoles.includes(role))) {
      return { ok: false as const, response: apiError(403, "FORBIDDEN", "You do not have permission to perform this action.") };
    }

    return { ok: true as const, userId: user.id, roles: roleNames };
  } catch (error) {
    console.error("Admin API authorization failed.", error);
    return { ok: false as const, response: apiError(500, "INTERNAL_ERROR", "Admin authorization could not be checked.") };
  }
}
