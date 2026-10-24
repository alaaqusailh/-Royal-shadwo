"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { adminRoles, hasAdminRole, wouldRemoveLastActiveSuperAdmin } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Prisma } from "@/generated/prisma/client";

const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(20).max(128),
  role: z.enum(adminRoles),
});

const updateUserSchema = z.object({
  userId: z.string().trim().min(1).max(191),
  roles: z.array(z.enum(adminRoles)).min(1),
  isActive: z.boolean(),
});

export type AdminUserActionState = {
  error?: "validation" | "unauthorized" | "email_exists" | "last_super_admin" | "self_deactivation" | "conflict" | "unavailable";
  success?: "created" | "updated";
};

function hasUniqueConstraint(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "P2002";
}

function isSerializationConflict(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "P2034";
}

export async function createAdminUser(
  _previousState: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  const parsed = createUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "validation" };

  const admin = await requireAdmin(["SUPER_ADMIN"]);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({
        where: { name: parsed.data.role },
        select: { id: true },
      });
      if (!role) throw new Error("The selected administrator role is not configured.");

      const user = await tx.user.create({
        data: {
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          passwordHash,
          locale: "ar",
          roles: { create: [{ roleId: role.id }] },
        },
        select: { id: true, email: true },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          entityType: "User",
          entityId: user.id,
          action: "admin:user_created",
          details: { email: user.email, role: parsed.data.role },
        },
      });
    });
  } catch (error) {
    if (hasUniqueConstraint(error)) return { error: "email_exists" };
    console.error("Administrator user creation failed.", error);
    return { error: "unavailable" };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/activity");
  return { success: "created" };
}

export async function updateAdminUser(
  _previousState: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    roles: formData.getAll("roles"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { error: "validation" };

  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (parsed.data.userId === admin.id && !parsed.data.isActive) {
    return { error: "self_deactivation" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: parsed.data.userId },
        select: {
          id: true,
          email: true,
          isActive: true,
          roles: { select: { role: { select: { name: true } } } },
        },
      });
      if (!target || !hasAdminRole(target.roles.map(({ role }) => role.name), adminRoles)) {
        throw new Error("The selected administrator account was not found.");
      }

      const currentIsSuperAdmin = target.roles.some(({ role }) => role.name === "SUPER_ADMIN");
      if (currentIsSuperAdmin) {
        const activeSuperAdminCount = await tx.user.count({
          where: {
            isActive: true,
            roles: { some: { role: { name: "SUPER_ADMIN" } } },
          },
        });
        if (wouldRemoveLastActiveSuperAdmin(
          activeSuperAdminCount,
          currentIsSuperAdmin,
          target.isActive,
          parsed.data.roles,
          parsed.data.isActive,
        )) {
          throw new Error("LAST_ACTIVE_SUPER_ADMIN");
        }
      }

      const roles = await tx.role.findMany({
        where: { name: { in: parsed.data.roles } },
        select: { id: true, name: true },
      });
      if (roles.length !== new Set(parsed.data.roles).size) {
        throw new Error("One or more administrator roles are not configured.");
      }

      await tx.userRole.deleteMany({ where: { userId: target.id } });
      await tx.userRole.createMany({
        data: roles.map((role) => ({ userId: target.id, roleId: role.id })),
      });
      await tx.user.update({
        where: { id: target.id },
        data: { isActive: parsed.data.isActive },
      });
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          entityType: "User",
          entityId: target.id,
          action: "admin:user_roles_updated",
          details: {
            email: target.email,
            previousRoles: target.roles.map(({ role }) => role.name),
            roles: parsed.data.roles,
            isActive: parsed.data.isActive,
          },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_ACTIVE_SUPER_ADMIN") {
      return { error: "last_super_admin" };
    }
    if (isSerializationConflict(error)) return { error: "conflict" };
    console.error("Administrator user update failed.", error);
    return { error: "unavailable" };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/activity");
  return { success: "updated" };
}
