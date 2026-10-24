import { apiError } from "@/lib/api/http";
import { prisma } from "@/lib/db";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  if (slug.length > 191 || !slugPattern.test(slug)) {
    return apiError(400, "INVALID_SLUG", "A valid page slug is required.");
  }
  try {
    const page = await prisma.page.findFirst({
      where: { slug, isPublished: true },
      select: {
        slug: true,
        title: true,
        titleAr: true,
        content: true,
        contentAr: true,
        seoTitle: true,
        seoTitleAr: true,
        seoDescription: true,
        seoDescriptionAr: true,
        publishedAt: true,
      },
    });
    return page ? Response.json({ data: page }) : apiError(404, "NOT_FOUND", "Page not found.");
  } catch (error) {
    console.error("Public page lookup failed.", error);
    return apiError(500, "INTERNAL_ERROR", "Page could not be loaded.");
  }
}
