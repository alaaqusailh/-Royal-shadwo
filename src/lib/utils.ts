import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const storefrontLocales = ["en", "ar"] as const;
export type StorefrontLocale = (typeof storefrontLocales)[number];

export function isStorefrontLocale(locale: string): locale is StorefrontLocale {
  return storefrontLocales.includes(locale as StorefrontLocale);
}
