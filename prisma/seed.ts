import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const roles = [
  { name: "SUPER_ADMIN", description: "Full access across the platform." },
  { name: "PRODUCT_MANAGER", description: "Manage products, media, and categories." },
  { name: "ORDER_MANAGER", description: "Manage inbound orders, fulfillment, and shipping." },
  { name: "SUPPORT_AGENT", description: "Support customers and handle order issues." },
  { name: "CUSTOMER", description: "Customer storefront access." },
] as const;

const permissions = [
  "catalog:read",
  "catalog:write",
  "orders:read",
  "orders:write",
  "customers:read",
  "customers:write",
  "payments:read",
  "payments:write",
  "coupons:read",
  "coupons:write",
  "reports:read",
  "settings:write",
  "audit:read",
] as const;

const sizes = [
  { code: "52", label: "52", sortOrder: 1 },
  { code: "54", label: "54", sortOrder: 2 },
  { code: "56", label: "56", sortOrder: 3 },
  { code: "58", label: "58", sortOrder: 4 },
] as const;

const colors = [
  { code: "obsidian", name: "Obsidian", nameAr: "أسود ملكي", hex: "#111111" },
  { code: "sand", name: "Warm sand", nameAr: "رملي دافئ", hex: "#B7A18A" },
  { code: "midnight", name: "Midnight", nameAr: "كحلي ليلي", hex: "#202532" },
] as const;

async function main() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  const adminName = process.env.ADMIN_SEED_NAME?.trim() || "Store Administrator";

  if (!adminEmail) {
    throw new Error("Set ADMIN_SEED_EMAIL before seeding the administrator.");
  }
  if (!adminPassword || adminPassword.length < 16) {
    throw new Error("Set ADMIN_SEED_PASSWORD to a value of at least 16 characters before seeding.");
  }

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  for (const name of permissions) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name, description: name },
    });
  }

  for (const size of sizes) {
    await prisma.size.upsert({
      where: { code: size.code },
      update: {},
      create: size,
    });
  }

  for (const color of colors) {
    await prisma.color.upsert({
      where: { code: color.code },
      update: {},
      create: color,
    });
  }

  const storeSettings = [
    { key: "store.name", value: "Royal Shadow" },
    { key: "store.currency", value: "SAR" },
    { key: "store.vatRate", value: "0.15" },
    { key: "store.defaultShippingFee", value: "25.00" },
    { key: "store.freeShippingThreshold", value: "750.00" },
    { key: "store.supportEmail", value: "" },
    { key: "store.supportPhone", value: "" },
    { key: "store.defaultLocale", value: "ar" },
    { key: "store.arEnabled", value: "true" },
  ] as const;

  for (const setting of storeSettings) {
    await prisma.storeSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: { ...setting, description: setting.key },
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "SUPER_ADMIN" },
    select: { id: true },
  });
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });
  const admin = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { isActive: true },
        select: { id: true },
      })
    : await prisma.user.create({
        data: {
          email: adminEmail,
          fullName: adminName,
          passwordHash: await bcrypt.hash(adminPassword, 12),
          locale: "ar",
          roles: { create: [{ roleId: adminRole.id }] },
        },
        select: { id: true },
      });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
