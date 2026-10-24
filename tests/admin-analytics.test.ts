import assert from "node:assert/strict";
import test from "node:test";
import { isKnownAdminRange } from "../src/lib/admin/date-range";

const ranges = { "7d": 7, "30d": 30, "90d": 90 } as const;

test("admin date ranges accept only configured own keys", () => {
  assert.equal(isKnownAdminRange(ranges, "7d"), true);
  assert.equal(isKnownAdminRange(ranges, "30d"), true);
  assert.equal(isKnownAdminRange(ranges, "90d"), true);
  assert.equal(isKnownAdminRange(ranges, "toString"), false);
  assert.equal(isKnownAdminRange(ranges, "constructor"), false);
  assert.equal(isKnownAdminRange(ranges, undefined), false);
});
