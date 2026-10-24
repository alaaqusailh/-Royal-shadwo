import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { imageUrlSchema, linkUrlSchema } from "../src/lib/api/validation";
import {
  ImageUploadError,
  isUploadedImagePath,
  isVercelBlobImageUrl,
  imageUploadMaxBytes,
  readUploadedImage,
  removeUploadedImage,
  saveUploadedImage,
  storedImageExists,
} from "../src/lib/storage/image-storage";
import { isSafeImagePath } from "../src/lib/storage/image-path";
import { GET as serveUploadedImage } from "../src/app/uploads/[filename]/route";

test("local image storage persists valid image bytes and rejects invalid formats and sizes", async () => {
  const storageDirectory = await mkdtemp(path.join(tmpdir(), "fashion-store-image-test-"));
  const previousDirectory = process.env.IMAGE_STORAGE_DIR;
  const previousLimit = process.env.IMAGE_UPLOAD_MAX_BYTES;
  process.env.IMAGE_STORAGE_DIR = storageDirectory;
  delete process.env.IMAGE_UPLOAD_MAX_BYTES;

  try {
    const fixture = new Uint8Array(await readFile(path.join(process.cwd(), "public", "products", "safa-abaya.jpg")));
    const uploadedPath = await saveUploadedImage(new File([fixture], "device-photo.jpg", { type: "image/jpeg" }));

    assert.equal(isUploadedImagePath(uploadedPath), true);
    assert.equal(await storedImageExists(uploadedPath), true);
    assert.deepEqual((await readUploadedImage(uploadedPath))?.bytes, Buffer.from(fixture));
    assert.equal(imageUrlSchema.safeParse(uploadedPath).success, true);
    assert.equal(imageUrlSchema.safeParse("https://images.example.test/photo.jpg").success, false);
    assert.equal(imageUrlSchema.safeParse("/uploads/../../private.jpg").success, false);
    assert.equal(linkUrlSchema.safeParse("/ar/products").success, true);
    assert.equal(linkUrlSchema.safeParse("https://store.example.test/policy").success, true);
    assert.equal(linkUrlSchema.safeParse("javascript:alert(1)").success, false);
    assert.equal(linkUrlSchema.safeParse("//example.test/path").success, false);
    assert.equal(linkUrlSchema.safeParse("http://example.test/path").success, false);

    const routeResponse = await serveUploadedImage(new Request(`http://localhost${uploadedPath}`), {
      params: Promise.resolve({ filename: uploadedPath.split("/").at(-1)! }),
    });
    assert.equal(routeResponse.status, 200);
    assert.equal(routeResponse.headers.get("content-type"), "image/jpeg");
    assert.deepEqual(Buffer.from(await routeResponse.arrayBuffer()), Buffer.from(fixture));

    await assert.rejects(
      saveUploadedImage(new File(["not an image"], "bad.jpg", { type: "image/jpeg" })),
      (error: unknown) => error instanceof ImageUploadError && error.code === "INVALID_IMAGE",
    );
    await assert.rejects(
      saveUploadedImage(new File(["<svg/>"], "bad.svg", { type: "image/svg+xml" })),
      (error: unknown) => error instanceof ImageUploadError && error.code === "UNSUPPORTED_IMAGE",
    );
    process.env.IMAGE_UPLOAD_MAX_BYTES = "10";
    await assert.rejects(
      saveUploadedImage(new File([fixture], "too-large.jpg", { type: "image/jpeg" })),
      (error: unknown) => error instanceof ImageUploadError && error.code === "TOO_LARGE",
    );

    assert.equal(await removeUploadedImage(uploadedPath), true);
    assert.equal(await storedImageExists(uploadedPath), false);
  } finally {
    if (previousDirectory === undefined) delete process.env.IMAGE_STORAGE_DIR;
    else process.env.IMAGE_STORAGE_DIR = previousDirectory;
    if (previousLimit === undefined) delete process.env.IMAGE_UPLOAD_MAX_BYTES;
    else process.env.IMAGE_UPLOAD_MAX_BYTES = previousLimit;
    await rm(storageDirectory, { recursive: true, force: true });
  }
});

test("image storage validates Vercel Blob URLs and requires durable storage on Vercel", async () => {
  assert.equal(isVercelBlobImageUrl("https://store.public.blob.vercel-storage.com/product-images/abc.jpg"), true);
  assert.equal(isSafeImagePath("https://store.public.blob.vercel-storage.com/product-images/abc.webp"), true);
  assert.equal(isUploadedImagePath("https://store.public.blob.vercel-storage.com/product-images/abc.png"), true);
  assert.equal(isVercelBlobImageUrl("http://store.public.blob.vercel-storage.com/product.jpg"), false);
  assert.equal(isVercelBlobImageUrl("https://public.blob.vercel-storage.com/product.jpg"), false);
  assert.equal(isVercelBlobImageUrl("https://store.public.blob.vercel-storage.com.evil.test/product.jpg"), false);
  assert.equal(isVercelBlobImageUrl("https://store.public.blob.vercel-storage.com/product.svg"), false);
  assert.equal(isVercelBlobImageUrl("https://store.public.blob.vercel-storage.com/product.jpg?other=host"), false);

  const previousVercel = process.env.VERCEL;
  const previousToken = process.env.BLOB_READ_WRITE_TOKEN;
  const previousMaxBytes = process.env.IMAGE_UPLOAD_MAX_BYTES;
  process.env.VERCEL = "1";
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.IMAGE_UPLOAD_MAX_BYTES;
  try {
    assert.equal(imageUploadMaxBytes(), 4 * 1024 * 1024);
    const fixture = Buffer.from([0xff, 0xd8, 0xff]);
    await assert.rejects(
      saveUploadedImage(new File([fixture], "device-photo.jpg", { type: "image/jpeg" })),
      /BLOB_READ_WRITE_TOKEN must be configured/,
    );
    process.env.IMAGE_UPLOAD_MAX_BYTES = String(5 * 1024 * 1024);
    assert.throws(() => imageUploadMaxBytes(), /IMAGE_UPLOAD_MAX_BYTES/);
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = previousToken;
    if (previousMaxBytes === undefined) delete process.env.IMAGE_UPLOAD_MAX_BYTES;
    else process.env.IMAGE_UPLOAD_MAX_BYTES = previousMaxBytes;
  }
});
