import assert from "node:assert/strict";
import test from "node:test";
import { checkoutOrderSchema } from "../src/lib/validation/store";

const validOrder = {
  locale: "en",
  name: "Test Customer",
  email: "customer@example.com",
  phone: "0551234567",
  city: "Riyadh",
  district: "Al Olaya",
  street: "King Fahd Road 12",
  postalCode: "12211",
  items: [{ variantId: "variant-1", quantity: 2 }],
};

test("checkout accepts a valid Saudi guest order", () => {
  assert.equal(checkoutOrderSchema.safeParse(validOrder).success, true);
});

test("checkout rejects an invalid Saudi phone and excessive quantity", () => {
  assert.equal(checkoutOrderSchema.safeParse({ ...validOrder, phone: "123" }).success, false);
  assert.equal(
    checkoutOrderSchema.safeParse({
      ...validOrder,
      items: [{ variantId: "variant-1", quantity: 11 }],
    }).success,
    false,
  );
});
