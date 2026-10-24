"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { Activity, BarChart3, Boxes, LayoutDashboard, Package, Settings2, ShieldCheck, ShoppingBag, Tag, Users, WandSparkles } from "lucide-react";

const items = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER", "SUPPORT_AGENT"] },
  { href: "/admin/products", label: "المنتجات", icon: Package, roles: ["SUPER_ADMIN", "PRODUCT_MANAGER"] },
  { href: "/admin/categories", label: "التصنيفات", icon: Boxes, roles: ["SUPER_ADMIN", "PRODUCT_MANAGER"] },
  { href: "/admin/promotions", label: "العروض", icon: Tag, roles: ["SUPER_ADMIN", "PRODUCT_MANAGER"] },
  { href: "/admin/banners", label: "محتوى المتجر", icon: WandSparkles, roles: ["SUPER_ADMIN", "PRODUCT_MANAGER"] },
  { href: "/admin/home-sections", label: "أقسام الصفحة الرئيسية", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "PRODUCT_MANAGER"] },
  { href: "/admin/inventory", label: "المخزون", icon: Boxes, roles: ["SUPER_ADMIN", "PRODUCT_MANAGER"] },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag, roles: ["SUPER_ADMIN", "ORDER_MANAGER", "SUPPORT_AGENT"] },
  { href: "/admin/customers", label: "العملاء", icon: Users, roles: ["SUPER_ADMIN", "ORDER_MANAGER", "SUPPORT_AGENT"] },
  { href: "/admin/reports", label: "التقارير", icon: BarChart3, roles: ["SUPER_ADMIN", "ORDER_MANAGER"] },
  { href: "/admin/activity", label: "سجل النشاط", icon: Activity, roles: ["SUPER_ADMIN"] },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings2, roles: ["SUPER_ADMIN"] },
  { href: "/admin/users", label: "إدارة المسؤولين", icon: ShieldCheck, roles: ["SUPER_ADMIN"] },
];

export function AdminSidebar({ roles }: { roles: readonly string[] }) {
  const pathname = usePathname();
  const visibleItems = items.filter((item) => item.roles.some((role) => roles.includes(role)));

  return (
    <aside className="w-full shrink-0 border-b border-neutral-200 bg-neutral-950 text-white md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-16 items-center border-b border-white/10 px-5 text-sm font-semibold tracking-[0.16em] uppercase">
        <Image src={BRAND.logo} alt="" width={36} height={36} className="me-3 h-9 w-9 border border-[#c8a96c]/60 object-cover" />
        <span>{BRAND.name.ar} <span className="text-[#c8a96c]">· الإدارة</span></span>
      </div>
      <nav aria-label="التنقل الإداري" className="flex gap-1 overflow-x-auto p-3 md:sticky md:top-0 md:block md:max-h-screen md:space-y-1 md:overflow-y-auto md:p-4">
        {visibleItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`)) ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`))
                ? "border-[#c8a96c]/30 bg-[#c8a96c]/10 text-[#e8d2a8]"
                : "border-transparent text-neutral-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
