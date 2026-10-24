import { z } from "zod";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { removeCartItem, loadCart, updateCartItemQuantity } from "@/lib/api/cart";
import { cartResponse, getCartSession } from "@/lib/storefront/cart-session";
import { updateCartQuantitySchema } from "@/lib/validation/cart";

const itemIdSchema = z.string().min(1).max(191);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!itemIdSchema.safeParse(id).success) {
    return apiError(400, "INVALID_CART_ITEM", "A valid cart item is required.");
  }
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = updateCartQuantitySchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const session = await getCartSession();
    const result = await updateCartItemQuantity(session.id, id, parsed.data.quantity);
    if (!result.ok) return cartResponse(session, { error: { code: result.code, message: result.message } }, result.status);
    return cartResponse(session, { data: await loadCart(session.id) });
  } catch (error) {
    console.error("Guest cart quantity could not be updated.", error);
    return apiError(500, "INTERNAL_ERROR", "The cart quantity could not be updated.");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!itemIdSchema.safeParse(id).success) {
    return apiError(400, "INVALID_CART_ITEM", "A valid cart item is required.");
  }

  try {
    const session = await getCartSession();
    if (!(await removeCartItem(session.id, id))) {
      return cartResponse(session, { error: { code: "CART_ITEM_NOT_FOUND", message: "The cart item could not be found." } }, 404);
    }
    return cartResponse(session, { data: await loadCart(session.id) });
  } catch (error) {
    console.error("Guest cart item could not be removed.", error);
    return apiError(500, "INTERNAL_ERROR", "The cart item could not be removed.");
  }
}
