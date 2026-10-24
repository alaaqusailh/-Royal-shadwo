import { BRAND } from "@/lib/brand";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: "ok",
      checks: { database: "ok" },
      app: BRAND.name.en,
      environment: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
    });
  } catch {
    console.error("Health check failed because the database is unavailable.");
    return Response.json({
      status: "error",
      checks: { database: "error" },
      app: BRAND.name.en,
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
