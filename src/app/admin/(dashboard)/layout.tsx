import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminSignOutButton } from "@/components/admin/sign-out-button";
import { requireAdmin } from "@/lib/auth/require-admin";
import { BRAND } from "@/lib/brand";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdmin();

  return (
    <div lang="ar" dir="rtl" className="flex min-h-screen flex-col bg-neutral-100 text-right text-neutral-900 font-arabic md:flex-row">
      <AdminSidebar roles={admin.roles} />
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs text-neutral-500">{BRAND.name.ar} · لوحة الإدارة</p>
            <h1 className="text-xl font-semibold">لوحة تحكم المتجر</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-left" dir="ltr">
              <p className="text-sm font-medium">{admin.fullName}</p>
              <p className="text-xs text-neutral-500" dir="rtl">{admin.roles.map((role) => ({
                SUPER_ADMIN: "مدير النظام",
                PRODUCT_MANAGER: "مدير المنتجات",
                ORDER_MANAGER: "مدير الطلبات",
                SUPPORT_AGENT: "خدمة العملاء",
              })[role] ?? role).join("، ")}</p>
            </div>
            <AdminSignOutButton />
          </div>
        </header>
        <main className="min-w-0 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
