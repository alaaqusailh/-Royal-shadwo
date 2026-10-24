import { z } from "zod";
import { isSafeImagePath } from "@/lib/storage/image-path";

export const imageUrlSchema = z.string().trim().min(1).max(500).refine(isSafeImagePath);

export const linkUrlSchema = z.string().trim().max(500).refine((value) => {
  if (value.startsWith("/") && !value.startsWith("//")) return !value.includes("\\");
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
});
