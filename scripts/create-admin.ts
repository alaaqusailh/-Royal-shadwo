import "dotenv/config";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../src/lib/db";

const adminCredentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(20).max(128),
});

async function main() {
  const credentials = adminCredentialsSchema.safeParse({
    email: process.env.ADMIN_SEED_EMAIL,
    password: process.env.ADMIN_SEED_PASSWORD,
  });

  if (!credentials.success) {
    throw new Error("Set ADMIN_SEED_EMAIL and a unique ADMIN_SEED_PASSWORD of at least 20 characters in .env.");
  }

  const email = credentials.data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(credentials.data.password, 12);
  await prisma.$transaction(async (tx) => {
    const role = await tx.role.upsert({
      where: { name: "SUPER_ADMIN" },
      update: {},
      create: {
        name: "SUPER_ADMIN",
        description: "Full access across the platform.",
      },
      select: { id: true },
    });

    const account = await tx.user.upsert({
      where: { email },
      update: {
        isActive: true,
        passwordHash,
      },
      create: {
        email,
        fullName: "Royal Shadow Administrator",
        passwordHash,
        locale: "ar",
      },
      select: { id: true, email: true },
    });

    await tx.userRole.upsert({
      where: { userId_roleId: { userId: account.id, roleId: role.id } },
      update: {},
      create: { userId: account.id, roleId: role.id },
    });

    await tx.auditLog.create({
      data: {
        userId: account.id,
        entityType: "USER",
        entityId: account.id,
        action: "ADMIN_ACCOUNT_BOOTSTRAPPED",
        details: { email: account.email, role: "SUPER_ADMIN" },
      },
    });

  });

  console.log("The configured administrator account is active and has SUPER_ADMIN access.");
  console.log("The password was read from ADMIN_SEED_PASSWORD and was not printed.");
}

main()
  .catch(() => {
    console.error(
      "Administrator bootstrap failed; verify database connectivity and the required admin environment variables without printing their values.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
