import { apiError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { products: { some: { isPublished: true } } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        nameAr: true,
        slug: true,
        description: true,
        descriptionAr: true,
        imageUrl: true,
      },
    });
    return Response.json({ data: categories });
  } catch (error) {
    console.error("Public category listing failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Categories could not be loaded.");
  }
}
