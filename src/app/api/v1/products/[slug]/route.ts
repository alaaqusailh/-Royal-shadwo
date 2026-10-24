import { apiError } from "@/lib/api/http";
import { getPublicProduct } from "@/lib/api/storefront";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  if (slug.length > 191 || !slugPattern.test(slug)) {
    return apiError(400, "INVALID_SLUG", "A valid product slug is required.");
  }
  try {
    const product = await getPublicProduct(slug);
    return product
      ? Response.json({ data: product })
      : apiError(404, "NOT_FOUND", "Product not found.");
  } catch (error) {
    console.error("Public product lookup failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Product could not be loaded.");
  }
}
