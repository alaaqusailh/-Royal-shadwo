import assert from "node:assert/strict";
import test from "node:test";
import { getLocalizedFabricName } from "../src/lib/storefront/copy";

test("fabric names are localized for Arabic product pages", () => {
  assert.equal(getLocalizedFabricName("Embroidered crepe", "ar"), "كريب مطرز");
  assert.equal(getLocalizedFabricName("Linen blend", "ar"), "مزيج الكتان");
});

test("fabric names remain unchanged in English and unknown Arabic values are preserved", () => {
  assert.equal(getLocalizedFabricName("Soft crepe", "en"), "Soft crepe");
  assert.equal(getLocalizedFabricName("Custom fabric", "ar"), "Custom fabric");
});
