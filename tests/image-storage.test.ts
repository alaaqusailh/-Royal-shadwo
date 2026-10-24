import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { imageUrlSchema, linkUrlSchema } from "../src/lib/api/validation";
import {
  ImageUploadError,
  isUploadedImagePath,
  readUploadedImage,
  removeUploadedImage,
  saveUploadedImage,
  storedImageExists,
} from "../src/lib/storage/local-images";
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
