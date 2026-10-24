import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { adminRoles, hasAdminRole, type AdminRole } from "@/lib/auth/roles";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const allowedRoles: ReadonlySet<string> = new Set(adminRoles);
const findUserByEmail = cache((email: string) => prisma.user.findUnique({
  where: { email },
  select: {
    id: true,
    email: true,
    fullName: true,
    isActive: true,
    roles: {
      select: {
        role: { select: { name: true } },
      },
    },
  },
}));

function isAdminRole(role: string): role is AdminRole {
  return allowedRoles.has(role);
}

export async function requireAdmin(requiredRoles?: readonly AdminRole[]) {
  const session = await getCurrentSession();
  const email = session?.user?.email;

  if (!email) {
    redirect("/admin/login");
  }

  const user = await findUserByEmail(email);
  const roles = user?.roles.map(({ role }) => role.name).filter(isAdminRole) ?? [];

  if (!user?.isActive || roles.length === 0) {
    redirect("/admin/login?error=unauthorized");
  }

  if (requiredRoles && !hasAdminRole(roles, requiredRoles)) {
    notFound();
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roles,
  };
}
