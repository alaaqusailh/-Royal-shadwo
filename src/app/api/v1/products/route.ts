import { apiError, validationError } from "@/lib/api/http";
import { listPublicProducts, productListQuerySchema } from "@/lib/api/storefront";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = productListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  try {
    return Response.json(await listPublicProducts(parsed.data));
  } catch (error) {
    console.error("Public product listing failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Products could not be loaded.");
  }
}
