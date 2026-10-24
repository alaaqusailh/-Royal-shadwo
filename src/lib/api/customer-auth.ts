import "server-only";
import { getCurrentSession } from "@/lib/auth/session";
import { apiError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

export async function authorizeApiCustomer() {
  try {
    const session = await getCurrentSession();
    const email = session?.user?.email;
    if (!email) {
      return { ok: false as const, response: apiError(401, "UNAUTHENTICATED", "Customer authentication is required.") };
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        isActive: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    const isCustomer = user?.roles.some(({ role }) => role.name === "CUSTOMER") ?? false;
    if (!user?.isActive || !isCustomer) {
      return { ok: false as const, response: apiError(403, "FORBIDDEN", "A customer account is required.") };
    }

    return { ok: true as const, userId: user.id, fullName: user.fullName };
  } catch (error) {
    console.error("Customer API authorization failed.", error);
    return { ok: false as const, response: apiError(500, "INTERNAL_ERROR", "Customer authorization could not be checked.") };
  }
}
