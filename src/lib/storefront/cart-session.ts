import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { CartSession } from "@/lib/api/cart";

const cookieName = "royal_shadow_cart";
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export async function getCartSession(): Promise<CartSession> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(cookieName)?.value;
  const shouldSetCookie = !existingToken || !tokenPattern.test(existingToken);
  const cookieToken = shouldSetCookie ? randomBytes(32).toString("base64url") : existingToken;
  const sessionId = createHash("sha256").update(cookieToken).digest("hex");
  const cart = await prisma.cart.upsert({
    where: { sessionId },
    create: { sessionId },
    update: {},
    select: { id: true },
  });

  return { id: cart.id, cookieToken, shouldSetCookie };
}

export function cartResponse(session: CartSession, body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  if (session.shouldSetCookie) {
    response.cookies.set(cookieName, session.cookieToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }
  return response;
}
