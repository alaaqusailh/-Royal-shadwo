import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

const cartItemInclude = {
  product: {
    select: {
      id: true,
      name: true,
      nameAr: true,
      slug: true,
      basePrice: true,
      isPublished: true,
      category: { select: { slug: true } },
      images: {
        orderBy: { sortOrder: "asc" as const },
        take: 1,
        select: { url: true },
      },
    },
  },
  variant: {
    include: {
      size: true,
      color: true,
      inventory: true,
    },
  },
} satisfies Prisma.CartItemInclude;

export type CartSession = {
  id: string;
  cookieToken: string;
  shouldSetCookie: boolean;
};

export type CartMutationFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export async function loadCart(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: { orderBy: { createdAt: "asc" }, include: cartItemInclude } },
  });
  if (!cart) throw new Error("The guest cart session could not be loaded.");

  return {
    items: cart.items.map((item) => {
      const variant = item.variant;
      const inventory = variant?.inventory;
      const available = Boolean(
        variant?.isActive &&
          item.product.isPublished &&
          inventory &&
          inventory.availableStock >= item.quantity,
      );
      const issue = !variant
        ? "variant_missing"
        : !variant.isActive || !item.product.isPublished || !inventory
          ? "unavailable"
          : inventory.availableStock < item.quantity
            ? "stock"
            : null;

      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        slug: item.product.slug,
        name: item.product.name,
        nameAr: item.product.nameAr ?? item.product.name,
        size: variant?.size.label ?? null,
        color: variant?.color.name ?? null,
        colorAr: variant?.color.nameAr ?? variant?.color.name ?? null,
        price: variant?.price.toNumber() ?? item.product.basePrice.toNumber(),
        imageUrl: item.product.images[0]?.url ?? "",
        quantity: item.quantity,
        available,
        availableStock: inventory?.availableStock ?? 0,
        issue,
      };
    }),
  };
}

export async function addCartVariant(
  cartId: string,
  variantId: string,
  quantity: number,
): Promise<{ ok: true } | CartMutationFailure> {
  return prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findFirst({
      where: {
        id: variantId,
        isActive: true,
        product: { isPublished: true },
      },
      include: { inventory: true },
    });
    if (!variant) {
      return { ok: false, status: 404, code: "VARIANT_UNAVAILABLE", message: "The selected size is no longer available." };
    }
    if (!variant.inventory) {
      return { ok: false, status: 409, code: "OUT_OF_STOCK", message: "The selected size is out of stock." };
    }

    const existing = await tx.cartItem.findUnique({
      where: { cartId_variantId: { cartId, variantId } },
      select: { id: true, quantity: true },
    });
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > 10) {
      return { ok: false, status: 409, code: "QUANTITY_LIMIT", message: "A maximum of 10 units per size may be added." };
    }
    if (nextQuantity > variant.inventory.availableStock) {
      return { ok: false, status: 409, code: "OUT_OF_STOCK", message: "The selected size is not available in that quantity." };
    }

    await tx.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      create: { cartId, productId: variant.productId, variantId, quantity },
      update: { quantity: nextQuantity },
    });
    return { ok: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateCartItemQuantity(
  cartId: string,
  itemId: string,
  quantity: number,
): Promise<{ ok: true } | CartMutationFailure> {
  return prisma.$transaction(async (tx) => {
    const item = await tx.cartItem.findFirst({
      where: { id: itemId, cartId },
      include: { product: true, variant: { include: { inventory: true } } },
    });
    if (!item) {
      return { ok: false, status: 404, code: "CART_ITEM_NOT_FOUND", message: "The cart item could not be found." };
    }
    if (!item.variantId || !item.variant?.isActive || !item.product.isPublished || !item.variant.inventory) {
      return { ok: false, status: 409, code: "VARIANT_UNAVAILABLE", message: "Choose an available size before updating this item." };
    }
    if (quantity > item.variant.inventory.availableStock) {
      return { ok: false, status: 409, code: "OUT_OF_STOCK", message: "The selected size is not available in that quantity." };
    }

    await tx.cartItem.update({ where: { id: item.id }, data: { quantity } });
    return { ok: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function removeCartItem(cartId: string, itemId: string) {
  const result = await prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
  return result.count > 0;
}

export async function clearCart(cartId: string) {
  await prisma.cartItem.deleteMany({ where: { cartId } });
}
