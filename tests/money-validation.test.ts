import assert from "node:assert/strict";
import test from "node:test";
import { isCompareAtPriceValid } from "../src/lib/validation/money";

test("compare-at price must be greater than the base price in minor currency units", () => {
  assert.equal(isCompareAtPriceValid("99.99", "100"), true);
  assert.equal(isCompareAtPriceValid("100", "100.01"), true);
  assert.equal(isCompareAtPriceValid("100", "100.00"), false);
  assert.equal(isCompareAtPriceValid("100.01", "100"), false);
  assert.equal(isCompareAtPriceValid("100", null), true);
});
