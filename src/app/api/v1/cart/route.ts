import { apiError } from "@/lib/api/http";
import { clearCart, loadCart } from "@/lib/api/cart";
import { cartResponse, getCartSession } from "@/lib/storefront/cart-session";

export async function GET() {
  try {
    const session = await getCartSession();
    return cartResponse(session, { data: await loadCart(session.id) });
  } catch (error) {
    console.error("Guest cart could not be loaded.", error);
    return apiError(500, "INTERNAL_ERROR", "The cart could not be loaded.");
  }
}

export async function DELETE() {
  try {
    const session = await getCartSession();
    await clearCart(session.id);
    return cartResponse(session, { data: { items: [] } });
  } catch (error) {
    console.error("Guest cart could not be cleared.", error);
    return apiError(500, "INTERNAL_ERROR", "The cart could not be cleared.");
  }
}
