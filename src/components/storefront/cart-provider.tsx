"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { z } from "zod";
import { getCopy } from "@/lib/storefront/copy";
import type { StorefrontLocale } from "@/lib/utils";

const favoriteSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  nameAr: z.string(),
  price: z.number().nonnegative(),
  imageUrl: z.string(),
});

const legacyCartLineSchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  slug: z.string(),
  name: z.string(),
  nameAr: z.string(),
  size: z.string(),
  color: z.string(),
  colorAr: z.string(),
  price: z.number().nonnegative(),
  imageUrl: z.string(),
  quantity: z.number().int().min(1).max(10),
});

const persistedStateSchema = z.object({
  cart: z.array(legacyCartLineSchema),
  favorites: z.array(favoriteSchema),
});
type LegacyCartLine = z.infer<typeof legacyCartLineSchema>;
type PersistedShoppingState = {
  found: boolean;
  cart: LegacyCartLine[];
  favorites: FavoriteProduct[];
};

const cartLineSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().nullable(),
  slug: z.string(),
  name: z.string(),
  nameAr: z.string(),
  size: z.string().nullable(),
  color: z.string().nullable(),
  colorAr: z.string().nullable(),
  price: z.number().nonnegative(),
  imageUrl: z.string(),
  quantity: z.number().int().min(1),
  available: z.boolean(),
  availableStock: z.number().int().nonnegative(),
  issue: z.enum(["variant_missing", "unavailable", "stock"]).nullable(),
});

const cartResponseSchema = z.object({
  data: z.object({ items: z.array(cartLineSchema) }),
});

const apiErrorSchema = z.object({
  error: z.object({ message: z.string() }),
});

export type CartLine = z.infer<typeof cartLineSchema> & {
  legacy?: boolean;
};
export type FavoriteProduct = z.infer<typeof favoriteSchema>;

export function isPurchasableCartLine(
  item: CartLine,
): item is CartLine & { variantId: string } {
  return item.available && item.variantId !== null;
}

type CartContextValue = {
  cart: CartLine[];
  favorites: FavoriteProduct[];
  hydrated: boolean;
  itemCount: number;
  cartError: string | null;
  addToCart: (variantId: string) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<void>;
  toggleFavorite: (product: FavoriteProduct) => void;
  isFavorite: (productId: string) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "royal-shadow-store-v1";
const legacyStorageKey = "assaf-store-v1";

function readPersistedState(key: string): PersistedShoppingState {
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return { found: false, cart: [], favorites: [] };
    const parsed = persistedStateSchema.safeParse(JSON.parse(saved));
    if (parsed.success) return { found: true, ...parsed.data };

    console.error("Saved shopping data was invalid; its contents were left untouched.", parsed.error);
  } catch (error) {
    console.error("Unable to read saved shopping data; its contents were left untouched.", error);
  }

  return { found: false, cart: [], favorites: [] };
}

function persistFavorites(favorites: FavoriteProduct[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ cart: [], favorites }));
  } catch (error) {
    console.error("Unable to save favorites in this browser.", error);
  }
}

function persistLegacyCart(
  cart: LegacyCartLine[],
  favorites: FavoriteProduct[],
) {
  try {
    window.localStorage.setItem(legacyStorageKey, JSON.stringify({ cart, favorites }));
  } catch (error) {
    console.error("Unable to update the previous cart after syncing.", error);
  }
}

function localizeError(locale: StorefrontLocale, kind: "load" | "update") {
  if (locale === "ar") {
    return kind === "load" ? "تعذر تحميل سلتك الآن. حاولي تحديث الصفحة." : "تعذر تحديث السلة. حاولي مرة أخرى.";
  }
  return kind === "load" ? "Your cart could not be loaded. Please refresh the page." : "Your cart could not be updated. Please try again.";
}

async function requestCart(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<CartLine[]> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch (error) {
    throw new Error("The cart API returned an invalid response.", { cause: error });
  }

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(responseBody);
    throw new Error(parsedError.success ? parsedError.data.error.message : "The cart request failed.");
  }

  const parsed = cartResponseSchema.safeParse(responseBody);
  if (!parsed.success) {
    throw new Error("The cart API response did not match the expected format.", { cause: parsed.error });
  }
  return parsed.data.data.items;
}

function makeLegacyLines(lines: LegacyCartLine[]): CartLine[] {
  return lines.map((line, index) => ({
    ...line,
    id: `legacy-${encodeURIComponent(line.variantId)}-${index}`,
    size: line.size || null,
    color: line.color || null,
    colorAr: line.colorAr || null,
    available: false,
    availableStock: 0,
    issue: "unavailable",
    legacy: true,
  }));
}

export function CartProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: StorefrontLocale;
}) {
  const copy = getCopy(locale);
  const [serverCart, setServerCart] = useState<CartLine[]>([]);
  const [legacyItems, setLegacyItems] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const previousState = readPersistedState(legacyStorageKey);
    const currentState = readPersistedState(storageKey);
    const savedFavorites = currentState.found ? currentState.favorites : previousState.favorites;

    async function hydrateCart() {
      try {
        let items = await requestCart("/api/v1/cart");
        const groups = new Map<string, LegacyCartLine[]>();
        for (const line of previousState.cart) {
          const group = groups.get(line.variantId) ?? [];
          group.push(line);
          groups.set(line.variantId, group);
        }

        const syncedVariantIds = new Set<string>();
        const remainingLegacy: LegacyCartLine[] = [];
        for (const [variantId, lines] of groups) {
          if (items.some((item) => item.variantId === variantId)) {
            syncedVariantIds.add(variantId);
            continue;
          }

          const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
          if (quantity <= 10) {
            try {
              items = await requestCart("/api/v1/cart/items", "POST", { variantId, quantity });
              syncedVariantIds.add(variantId);
              continue;
            } catch {
              // Keep unavailable legacy lines visible and removable in the cart.
            }
          }
          remainingLegacy.push(...lines);
        }

        if (syncedVariantIds.size > 0) {
          persistLegacyCart(
            previousState.cart.filter((line) => !syncedVariantIds.has(line.variantId)),
            previousState.favorites,
          );
        }
        if (cancelled) return;
        setServerCart(items);
        setLegacyItems(makeLegacyLines(remainingLegacy));
        setFavorites(savedFavorites);
        persistFavorites(savedFavorites);
        setHydrated(true);
      } catch (error) {
        console.error("Guest cart initialization failed.", error);
        if (cancelled) return;
        setLegacyItems(makeLegacyLines(previousState.cart));
        setFavorites(savedFavorites);
        setCartError(localizeError(locale, "load"));
        setHydrated(true);
      }
    }

    void hydrateCart();
    return () => {
      cancelled = true;
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, [locale]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey && event.key !== null) return;
      if (event.key === null) {
        setFavorites([]);
        return;
      }
      const saved = readPersistedState(storageKey);
      if (saved.found) setFavorites(saved.favorites);
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const addToCart = useCallback(async (variantId: string) => {
    try {
      const items = await requestCart("/api/v1/cart/items", "POST", { variantId, quantity: 1 });
      setServerCart(items);
      setCartError(null);
      setToastVisible(true);
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToastVisible(false), 3500);
      return true;
    } catch (error) {
      console.error("Selected product variant could not be added to the cart.", error);
      setCartError(localizeError(locale, "update"));
      return false;
    }
  }, [locale]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    try {
      const items = await requestCart(
        `/api/v1/cart/items/${encodeURIComponent(itemId)}`,
        "PATCH",
        { quantity },
      );
      setServerCart(items);
      setCartError(null);
      return true;
    } catch (error) {
      console.error("Cart item quantity could not be changed.", error);
      setCartError(localizeError(locale, "update"));
      return false;
    }
  }, [locale]);

  const removeFromCart = useCallback(async (itemId: string) => {
    if (itemId.startsWith("legacy-")) {
      const legacyItem = legacyItems.find((item) => item.id === itemId);
      if (!legacyItem) return false;
      const saved = readPersistedState(legacyStorageKey);
      persistLegacyCart(
        saved.cart.filter((line) => line.variantId !== legacyItem.variantId),
        saved.favorites,
      );
      setLegacyItems(makeLegacyLines(
        saved.cart.filter((line) => line.variantId !== legacyItem.variantId),
      ));
      return true;
    }

    try {
      const items = await requestCart(
        `/api/v1/cart/items/${encodeURIComponent(itemId)}`,
        "DELETE",
      );
      setServerCart(items);
      setCartError(null);
      return true;
    } catch (error) {
      console.error("Cart item could not be removed.", error);
      setCartError(localizeError(locale, "update"));
      return false;
    }
  }, [legacyItems, locale]);

  const clearCart = useCallback(async () => {
    try {
      const items = await requestCart("/api/v1/cart", "DELETE");
      setServerCart(items);
      setLegacyItems([]);
      const previousState = readPersistedState(legacyStorageKey);
      persistLegacyCart([], previousState.favorites);
      setCartError(null);
    } catch (error) {
      console.error("Guest cart could not be cleared after checkout.", error);
      setCartError(localizeError(locale, "update"));
    }
  }, [locale]);

  const toggleFavorite = useCallback((product: FavoriteProduct) => {
    setFavorites((current) => {
      const next = current.some((item) => item.productId === product.productId)
        ? current.filter((item) => item.productId !== product.productId)
        : [...current, product];
      persistFavorites(next);
      return next;
    });
  }, []);

  const cart = useMemo(() => [...serverCart, ...legacyItems], [serverCart, legacyItems]);
  const isFavorite = useCallback(
    (productId: string) => favorites.some((product) => product.productId === productId),
    [favorites],
  );
  const value = useMemo(
    () => ({
      cart,
      favorites,
      hydrated,
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      cartError,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      toggleFavorite,
      isFavorite,
    }),
    [cart, favorites, hydrated, cartError, addToCart, updateQuantity, removeFromCart, clearCart, toggleFavorite, isFavorite],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {toastVisible && (
        <div role="status" aria-live="polite" className="fixed inset-x-4 bottom-4 z-[80] mx-auto flex max-w-md items-center justify-between gap-4 border border-[#c8a96c]/50 bg-[#0d0d0d] px-4 py-3 text-sm text-white shadow-xl">
          <span className="flex items-center gap-2">
            <Check size={16} className="shrink-0 text-[#c8a96c]" />
            {copy.cart.addedToast}
          </span>
          <Link href={`/${locale}/cart`} className="shrink-0 border-b border-[#c8a96c] pb-0.5 text-xs text-[#e1c891]">
            {copy.cart.viewCart}
          </Link>
          <button type="button" onClick={() => setToastVisible(false)} aria-label={locale === "ar" ? "إغلاق" : "Dismiss"} className="shrink-0 p-1 text-white/60">
            <X size={15} />
          </button>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useStoreCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useStoreCart must be used inside CartProvider.");
  }
  return context;
}
