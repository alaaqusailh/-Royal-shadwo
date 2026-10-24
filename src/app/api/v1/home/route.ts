import { apiError } from "@/lib/api/http";
import { getPublicHome } from "@/lib/api/storefront";

export async function GET() {
  try {
    return Response.json({ data: await getPublicHome() });
  } catch (error) {
    console.error("Public home content could not be loaded.", error);
    return apiError(500, "INTERNAL_ERROR", "Home content could not be loaded.");
  }
}
