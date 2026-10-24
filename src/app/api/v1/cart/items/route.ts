import { addCartVariant, loadCart } from "@/lib/api/cart";
import { apiError, readJsonBody, validationError } from "@/lib/api/http";
import { cartResponse, getCartSession } from "@/lib/storefront/cart-session";
import { addToCartSchema } from "@/lib/validation/cart";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = addToCartSchema.safeParse(body.value);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const session = await getCartSession();
    const result = await addCartVariant(session.id, parsed.data.variantId, parsed.data.quantity);
    if (!result.ok) return cartResponse(session, { error: { code: result.code, message: result.message } }, result.status);
    return cartResponse(session, { data: await loadCart(session.id) }, 201);
  } catch (error) {
    console.error("Guest cart item could not be added.", error);
    return apiError(500, "INTERNAL_ERROR", "The selected size could not be added.");
  }
}
