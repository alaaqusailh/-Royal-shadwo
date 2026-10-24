"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function AdminSignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSignOut() {
    setPending(true);
    setError(undefined);
    try {
      await signOut({ callbackUrl: "/admin/login" });
    } catch {
      setError("تعذر تسجيل الخروج. يرجى إعادة المحاولة.");
      setPending(false);
    }
  }

  return (
    <div className="text-left" dir="rtl">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        className="min-h-9 rounded-lg border border-neutral-300 px-3 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? "جارٍ تسجيل الخروج…" : "تسجيل الخروج"}
      </button>
      {error && <p role="alert" className="mt-1 text-[11px] text-red-700">{error}</p>}
    </div>
  );
}
