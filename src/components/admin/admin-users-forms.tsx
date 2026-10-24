"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { adminRoles, type AdminRole } from "@/lib/auth/roles";
import {
  createAdminUser,
  updateAdminUser,
  type AdminUserActionState,
} from "@/app/admin/(dashboard)/users/actions";

const initialState: AdminUserActionState = {};

const roleLabels: Record<AdminRole, string> = {
  SUPER_ADMIN: "مدير النظام",
  PRODUCT_MANAGER: "مدير المنتجات",
  ORDER_MANAGER: "مدير الطلبات",
  SUPPORT_AGENT: "خدمة العملاء",
};

const errorMessages: Record<NonNullable<AdminUserActionState["error"]>, string> = {
  validation: "يرجى مراجعة الحقول. يجب ألا تقل كلمة المرور عن 20 حرفًا.",
  unauthorized: "ليس لديك صلاحية إدارة المسؤولين.",
  email_exists: "يوجد حساب مسجل بهذا البريد الإلكتروني.",
  last_super_admin: "يجب الإبقاء على مسؤول نظام نشط واحد على الأقل.",
  self_deactivation: "لا يمكنك إيقاف حسابك بنفسك.",
  conflict: "حدث تعديل متزامن من مسؤول آخر. أعد تحميل الصفحة ثم حاول مرة أخرى.",
  unavailable: "تعذر حفظ التغيير. حاول مرة أخرى أو تواصل مع مسؤول النظام.",
};

export function CreateAdminUserForm() {
  const [state, action, pending] = useActionState(createAdminUser, initialState);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium">
        الاسم الكامل
        <input name="fullName" required minLength={2} maxLength={120} autoComplete="name" className="min-h-11 rounded-xl border border-neutral-300 px-3 font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        البريد الإلكتروني
        <input name="email" type="email" required maxLength={254} autoComplete="email" className="min-h-11 rounded-xl border border-neutral-300 px-3 font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        كلمة مرور مؤقتة
        <input name="password" type="password" required minLength={20} maxLength={128} autoComplete="new-password" className="min-h-11 rounded-xl border border-neutral-300 px-3 font-normal" />
        <span className="text-xs font-normal text-neutral-500">استخدم كلمة مرور فريدة لا تقل عن 20 حرفًا.</span>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        الدور الأولي
        <select name="role" defaultValue="SUPPORT_AGENT" className="min-h-11 rounded-xl border border-neutral-300 bg-white px-3 font-normal">
          {adminRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
        </select>
      </label>
      <div className="sm:col-span-2">
        {state.error && <p role="alert" className="mb-3 text-sm text-red-700">{errorMessages[state.error]}</p>}
        {state.success === "created" && <p role="status" className="mb-3 text-sm text-green-700">تم إنشاء حساب المسؤول.</p>}
        <Button type="submit" disabled={pending}>{pending ? "جارٍ إنشاء الحساب..." : "إنشاء مسؤول"}</Button>
      </div>
    </form>
  );
}

export function AdminUserRolesForm({
  userId,
  roles,
  isActive,
}: {
  userId: string;
  roles: readonly AdminRole[];
  isActive: boolean;
}) {
  const [state, action, pending] = useActionState(updateAdminUser, initialState);

  return (
    <form action={action} className="min-w-64 space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <fieldset>
        <legend className="sr-only">أدوار المسؤول المعينة</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {adminRoles.map((role) => (
            <label key={role} className="flex items-center gap-2 text-xs text-neutral-700">
              <input type="checkbox" name="roles" value={role} defaultChecked={roles.includes(role)} className="h-4 w-4 accent-neutral-900" />
              {roleLabels[role]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-xs text-neutral-700">
        <input type="checkbox" name="isActive" defaultChecked={isActive} className="h-4 w-4 accent-neutral-900" />
        الحساب نشط
      </label>
      {state.error && <p role="alert" className="text-xs text-red-700">{errorMessages[state.error]}</p>}
      {state.success === "updated" && <p role="status" className="text-xs text-green-700">تم تحديث الحساب.</p>}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "جارٍ الحفظ..." : "حفظ الصلاحيات"}</Button>
    </form>
  );
}
