import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/health/route";
import { prisma } from "../src/lib/db";

test("health endpoint reports database connectivity", async () => {
  try {
    const response = await GET();
    const body = await response.json() as {
      status: string;
      checks: { database: string };
    };

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.checks.database, "ok");
  } finally {
    await prisma.$disconnect();
  }
});
