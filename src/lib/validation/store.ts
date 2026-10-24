import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  remember: z.boolean().optional(),
});

export const addressSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().min(8),
  city: z.string().min(2),
  district: z.string().optional(),
  street: z.string().min(5),
  postalCode: z.string().optional(),
  apartment: z.string().optional(),
  building: z.string().optional(),
});

export const checkoutSchema = z.object({
  addressId: z.string().min(1),
  shippingMethod: z.string().min(1),
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).max(10),
});

export const checkoutOrderSchema = z.object({
  locale: z.enum(["en", "ar"]),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().regex(/^(?:\+?966|00966|0)?5\d{8}$/, "Enter a valid Saudi mobile number."),
  city: z.string().trim().min(2).max(100),
  district: z.string().trim().max(100),
  street: z.string().trim().min(5).max(200),
  postalCode: z.string().trim().max(20),
  items: z.array(
    z.object({
      variantId: z.string().min(1).max(191),
      quantity: z.number().int().min(1).max(10),
    }),
  ).min(1).max(30),
});
