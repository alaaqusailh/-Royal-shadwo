import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be configured before Prisma can connect.");
  }

  const connection = new URL(connectionString);
  const port = Number(connection.port || "3306");
  const connectionLimit = Number(connection.searchParams.get("connection_limit") ?? "5");
  const database = decodeURIComponent(connection.pathname.replace(/^\/+/, ""));

  if (
    connection.protocol !== "mysql:" ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !Number.isInteger(connectionLimit) ||
    connectionLimit < 1 ||
    !database
  ) {
    throw new Error("DATABASE_URL must be a valid MySQL URL with a database and positive connection limit.");
  }

  const adapter = new PrismaMariaDb({
    host: connection.hostname,
    port,
    user: decodeURIComponent(connection.username),
    password: decodeURIComponent(connection.password),
    database,
    connectionLimit,
  });

  return new PrismaClient({ adapter });
}

const prismaClient = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prismaClient;
}

export const prisma = prismaClient;
