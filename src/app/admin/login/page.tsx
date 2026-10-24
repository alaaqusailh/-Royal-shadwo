"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof email !== "string" || typeof password !== "string") {
      setIsSubmitting(false);
      setError("أدخل بريدًا إلكترونيًا وكلمة مرور صالحين.");
      return;
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/admin",
        redirect: false,
      });

      if (!result || result.error) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة، أو أن الحساب لا يملك صلاحية الدخول.");
        return;
      }

      window.location.assign(result.url ?? "/admin");
    } catch {
      setError("تعذر تسجيل الدخول الآن. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main lang="ar" dir="rtl" className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 font-arabic">
      <div className="w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-xs text-neutral-500">دخول آمن</p>
        <h1 className="mt-3 text-3xl font-semibold">تسجيل دخول المسؤول</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-neutral-700">البريد الإلكتروني</label>
            <Input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-neutral-700">كلمة المرور</label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>
      </div>
    </main>
  );
}
