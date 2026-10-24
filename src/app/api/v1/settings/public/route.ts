import { apiError } from "@/lib/api/http";
import { getPublicSettings } from "@/lib/api/storefront";

export async function GET() {
  try {
    return Response.json({ data: await getPublicSettings() });
  } catch (error) {
    console.error("Public store settings could not be loaded.", error);
    return apiError(500, "INTERNAL_ERROR", "Store settings could not be loaded.");
  }
}
