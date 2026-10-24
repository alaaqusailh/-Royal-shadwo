import assert from "node:assert/strict";
import test from "node:test";
import { hasAdminRole, isAdminRole, wouldRemoveLastActiveSuperAdmin } from "../src/lib/auth/roles";

test("role checks accept any matching assigned admin role", () => {
  assert.equal(hasAdminRole(["CUSTOMER", "PRODUCT_MANAGER"], ["SUPER_ADMIN", "PRODUCT_MANAGER"]), true);
});

test("role checks reject roles outside the page policy", () => {
  assert.equal(hasAdminRole(["SUPPORT_AGENT"], ["SUPER_ADMIN", "PRODUCT_MANAGER"]), false);
});

test("admin role guard excludes customer role", () => {
  assert.equal(isAdminRole("SUPER_ADMIN"), true);
  assert.equal(isAdminRole("CUSTOMER"), false);
});

test("last active super administrator cannot lose the role or be deactivated", () => {
  assert.equal(wouldRemoveLastActiveSuperAdmin(1, true, true, ["PRODUCT_MANAGER"], true), true);
  assert.equal(wouldRemoveLastActiveSuperAdmin(1, true, true, ["SUPER_ADMIN"], false), true);
});

test("last super administrator rule allows changes when another active super admin exists", () => {
  assert.equal(wouldRemoveLastActiveSuperAdmin(2, true, true, ["PRODUCT_MANAGER"], true), false);
});

test("inactive super administrator does not block a valid role change", () => {
  assert.equal(wouldRemoveLastActiveSuperAdmin(1, true, false, ["PRODUCT_MANAGER"], false), false);
});
