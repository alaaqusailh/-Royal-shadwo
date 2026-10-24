import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, del, head, put } from "@vercel/blob";
import {
  isLocalUploadedImagePath,
  isSafeImagePath,
  isVercelBlobImageUrl,
  localUploadedImageFilename,
} from "./image-path";

export {
  isLocalUploadedImagePath,
  isSafeImagePath,
  isUploadedImagePath,
  isVercelBlobImageUrl,
} from "./image-path";

const defaultMaxBytes = 5 * 1024 * 1024;
const vercelMaxUploadBytes = 4 * 1024 * 1024;
const maxAllowedBytes = 20 * 1024 * 1024;
const signatures = {
  "image/jpeg": { extension: "jpg", check: (buffer: Buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  "image/png": { extension: "png", check: (buffer: Buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  "image/webp": { extension: "webp", check: (buffer: Buffer) => buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" },
} as const;

export class ImageUploadError extends Error {
  constructor(public readonly code: "TOO_LARGE" | "UNSUPPORTED_IMAGE" | "INVALID_IMAGE") {
    super(code);
  }
}

export function imageUploadMaxBytes() {
  const raw = process.env.IMAGE_UPLOAD_MAX_BYTES;
  const maximum = process.env.VERCEL === "1" ? vercelMaxUploadBytes : maxAllowedBytes;
  if (!raw) return process.env.VERCEL === "1" ? vercelMaxUploadBytes : defaultMaxBytes;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`IMAGE_UPLOAD_MAX_BYTES must be an integer between 1 and ${maximum}.`);
  }
  return value;
}

function getBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return token;
  if (process.env.VERCEL === "1") {
    throw new Error("BLOB_READ_WRITE_TOKEN must be configured for image storage on Vercel.");
  }
  return null;
}

function imageDirectory() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.IMAGE_STORAGE_DIR || ".data/uploads");
}

function fileNameForImagePath(imagePath: string) {
  return localUploadedImageFilename(imagePath);
}

export async function storedImageExists(imagePath: string) {
  if (!isSafeImagePath(imagePath)) return false;
  if (isVercelBlobImageUrl(imagePath)) {
    const token = getBlobToken();
    if (!token) return false;
    try {
      await head(imagePath, { token });
      return true;
    } catch (error) {
      if (error instanceof BlobNotFoundError) return false;
      throw error;
    }
  }

  const filename = fileNameForImagePath(imagePath);
  const fullPath = filename
    ? path.join(/*turbopackIgnore: true*/ imageDirectory(), filename)
    : path.resolve(process.cwd(), "public", imagePath.slice(1));
  try {
    return (await stat(fullPath)).isFile();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

export async function saveUploadedImage(file: File) {
  const maxBytes = imageUploadMaxBytes();
  if (file.size < 1) throw new ImageUploadError("INVALID_IMAGE");
  if (file.size > maxBytes) throw new ImageUploadError("TOO_LARGE");

  const bytes = Buffer.from(await file.arrayBuffer());
  const signature = signatures[file.type as keyof typeof signatures];
  if (!signature) throw new ImageUploadError("UNSUPPORTED_IMAGE");
  if (!signature.check(bytes)) throw new ImageUploadError("INVALID_IMAGE");

  const token = getBlobToken();
  if (token) {
    const uploaded = await put(`product-images/${randomUUID()}.${signature.extension}`, bytes, {
      access: "public",
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      contentType: file.type,
      token,
    });
    return uploaded.url;
  }

  const filename = `${randomUUID()}.${signature.extension}`;
  const directory = imageDirectory();
  await mkdir(directory, { recursive: true });
  const destination = path.join(/*turbopackIgnore: true*/ directory, filename);
  try {
    await writeFile(destination, bytes, { flag: "wx", mode: 0o644 });
  } catch (error) {
    await rm(destination, { force: true });
    throw error;
  }
  return `/uploads/${filename}`;
}

export async function readUploadedImage(imagePath: string) {
  if (!isLocalUploadedImagePath(imagePath)) return null;
  const filename = fileNameForImagePath(imagePath);
  if (!filename) return null;
  const bytes = await readFile(path.join(/*turbopackIgnore: true*/ imageDirectory(), filename));
  const extension = path.extname(filename).slice(1).toLowerCase();
  const contentType = extension === "jpg" ? "image/jpeg" : extension === "png" ? "image/png" : "image/webp";
  const signature = signatures[contentType as keyof typeof signatures];
  if (!signature.check(bytes)) return null;
  return { bytes, contentType };
}

export async function removeUploadedImage(imagePath: string) {
  if (isVercelBlobImageUrl(imagePath)) {
    const token = getBlobToken();
    if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is required to remove a Vercel Blob image.");
    try {
      await del(imagePath, { token });
    } catch (error) {
      if (error instanceof BlobNotFoundError) return true;
      throw error;
    }
    return true;
  }
  if (!isLocalUploadedImagePath(imagePath)) return false;
  const filename = fileNameForImagePath(imagePath);
  if (!filename) return false;
  await rm(path.join(/*turbopackIgnore: true*/ imageDirectory(), filename), { force: true });
  return true;
}
