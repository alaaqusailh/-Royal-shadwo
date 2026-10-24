import assert from "node:assert/strict";
import test from "node:test";
import { addToCartSchema, updateCartQuantitySchema } from "../src/lib/validation/cart";

test("cart additions require a variant and accept only a bounded quantity", () => {
  assert.equal(addToCartSchema.safeParse({ variantId: "variant-1" }).success, true);
  assert.equal(addToCartSchema.safeParse({ variantId: "variant-1", quantity: 10 }).success, true);
  assert.equal(addToCartSchema.safeParse({ quantity: 1 }).success, false);
  assert.equal(addToCartSchema.safeParse({ variantId: "variant-1", quantity: 11 }).success, false);
  assert.equal(addToCartSchema.safeParse({ variantId: "variant-1", price: 0.01 }).success, false);
});

test("cart quantity updates reject fractional, zero, excessive, and extra client data", () => {
  assert.equal(updateCartQuantitySchema.safeParse({ quantity: 1 }).success, true);
  assert.equal(updateCartQuantitySchema.safeParse({ quantity: 1.5 }).success, false);
  assert.equal(updateCartQuantitySchema.safeParse({ quantity: 0 }).success, false);
  assert.equal(updateCartQuantitySchema.safeParse({ quantity: 11 }).success, false);
  assert.equal(updateCartQuantitySchema.safeParse({ quantity: 2, price: 0.01 }).success, false);
});
