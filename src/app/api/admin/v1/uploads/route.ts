import { authorizeApiAdmin } from "@/lib/api/admin-auth";
import { apiError } from "@/lib/api/http";
import { prisma } from "@/lib/db";
import { ImageUploadError, imageUploadMaxBytes, isUploadedImagePath, removeUploadedImage, saveUploadedImage } from "@/lib/storage/image-storage";

export const runtime = "nodejs";

const uploadRoles = ["SUPER_ADMIN", "PRODUCT_MANAGER"] as const;

export async function POST(request: Request) {
  const auth = await authorizeApiAdmin(uploadRoles);
  if (!auth.ok) return auth.response;

  let maxBytes: number;
  try {
    maxBytes = imageUploadMaxBytes();
  } catch (error) {
    console.error("Image upload configuration is invalid.", error);
    return apiError(500, "UPLOAD_CONFIGURATION_ERROR", "Image uploads are not configured correctly.");
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (!request.headers.get("content-length")) {
    return apiError(411, "CONTENT_LENGTH_REQUIRED", "The upload request must include a content length.");
  }
  if (Number.isFinite(contentLength) && contentLength > maxBytes + 65_536) {
    return apiError(413, "IMAGE_TOO_LARGE", "The image exceeds the upload size limit.");
  }

  let file: File;
  try {
    const form = await request.formData();
    const files = form.getAll("file");
    const selectedFile = files.length === 1 ? files[0] : null;
    if (!(selectedFile instanceof File)) {
      return apiError(400, "INVALID_IMAGE", "Choose one JPEG, PNG, or WebP image.");
    }
    file = selectedFile;
  } catch (error) {
    console.error("Admin image upload request could not be parsed.", error);
    return apiError(400, "INVALID_UPLOAD_REQUEST", "The upload request could not be read.");
  }

  try {
    const imagePath = await saveUploadedImage(file);
    return Response.json({ data: { path: imagePath } }, { status: 201 });
  } catch (error) {
    if (error instanceof ImageUploadError) {
      if (error.code === "TOO_LARGE") return apiError(413, "IMAGE_TOO_LARGE", "The image exceeds the upload size limit.");
      if (error.code === "UNSUPPORTED_IMAGE") return apiError(415, "UNSUPPORTED_IMAGE", "Only JPEG, PNG, and WebP images are accepted.");
      return apiError(400, "INVALID_IMAGE", "The selected file is not a valid image.");
    }
    console.error("Admin image upload failed.", error);
    return apiError(500, "UPLOAD_FAILED", "The image could not be saved.");
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeApiAdmin(uploadRoles);
  if (!auth.ok) return auth.response;

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("path" in body) || typeof body.path !== "string") {
      return apiError(400, "INVALID_IMAGE_PATH", "A valid uploaded image path is required.");
    }
    const imagePath = body.path;
    if (!isUploadedImagePath(imagePath)) return apiError(400, "INVALID_IMAGE_PATH", "A valid uploaded image path is required.");

    const [productImage, banner, category] = await Promise.all([
      prisma.productImage.findFirst({ where: { url: imagePath }, select: { id: true } }),
      prisma.banner.findFirst({ where: { OR: [{ imageUrl: imagePath }, { mobileImageUrl: imagePath }] }, select: { id: true } }),
      prisma.category.findFirst({ where: { imageUrl: imagePath }, select: { id: true } }),
    ]);
    if (productImage || banner || category) {
      return Response.json({ data: { removed: false, retained: true } });
    }

    const removed = await removeUploadedImage(imagePath);
    return removed
      ? Response.json({ data: { removed: true } })
      : apiError(400, "INVALID_IMAGE_PATH", "A valid uploaded image path is required.");
  } catch (error) {
    console.error("Admin unused image cleanup failed.", error);
    return apiError(500, "CLEANUP_FAILED", "The unused image could not be removed.");
  }
}
