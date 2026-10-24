const localUploadPattern = /^\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp))$/i;

export function localUploadedImageFilename(value: string) {
  return localUploadPattern.exec(value)?.[1] ?? null;
}

export function isLocalUploadedImagePath(value: string) {
  return localUploadedImageFilename(value) !== null;
}

export function isVercelBlobImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      /\.(?:jpg|png|webp)$/i.test(url.pathname) &&
      !/%2f|%5c/i.test(url.pathname);
  } catch {
    return false;
  }
}

export function isUploadedImagePath(value: string) {
  return isLocalUploadedImagePath(value) || isVercelBlobImageUrl(value);
}

export function isSafeImagePath(value: string) {
  if (isUploadedImagePath(value)) return true;
  return /^\/(?:products|banners)\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value) &&
    !value.includes("..") &&
    !value.includes("//");
}
