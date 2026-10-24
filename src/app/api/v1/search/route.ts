import { apiError, validationError } from "@/lib/api/http";
import { listPublicProducts, productListQuerySchema } from "@/lib/api/storefront";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = productListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return validationError(parsed.error);
  if (!parsed.data.q) return apiError(400, "QUERY_REQUIRED", "A non-empty search query is required.");

  try {
    return Response.json(await listPublicProducts(parsed.data));
  } catch (error) {
    console.error("Public product search failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Search could not be completed.");
  }
}
