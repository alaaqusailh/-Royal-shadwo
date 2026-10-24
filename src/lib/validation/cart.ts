import { z } from "zod";

export const addToCartSchema = z.object({
  variantId: z.string().trim().min(1).max(191),
  quantity: z.number().int().min(1).max(10).default(1),
}).strict();

export const updateCartQuantitySchema = z.object({
  quantity: z.number().int().min(1).max(10),
}).strict();
