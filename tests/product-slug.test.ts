import assert from "node:assert/strict";
import test from "node:test";
import { generateProductSlug, productSlugSchema } from "../src/lib/catalog/product-slug";

test("product slug is generated from an English product name without a user-entered URL", () => {
  assert.equal(generateProductSlug("  Royal Shadow Abaya!  ", "1234abcd"), "royal-shadow-abaya-1234abcd");
});

test("product slug uses a safe fallback for names without ASCII letters", () => {
  assert.equal(generateProductSlug("عباية ملكية", "abcd1234"), "product-abcd1234");
});

test("custom product slug is normalized and constrained to safe URL segments", () => {
  assert.equal(productSlugSchema.parse(" Royal-Shadow-2026 "), "royal-shadow-2026");
  assert.equal(productSlugSchema.safeParse("https://example.com/product").success, false);
  assert.equal(productSlugSchema.safeParse("product name").success, false);
});
