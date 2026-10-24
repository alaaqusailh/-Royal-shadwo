import { randomUUID } from "node:crypto";
import { z } from "zod";

export const productSlugSchema = z.string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);

export function generateProductSlug(name: string, suffix = randomUUID().slice(0, 8)) {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "") || "product";

  return `${base}-${suffix}`;
}
