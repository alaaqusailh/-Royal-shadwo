import { AdminUserRolesForm, CreateAdminUserForm } from "@/components/admin/admin-users-forms";
import { Card } from "@/components/ui/card";
import { adminRoles, isAdminRole } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { adminDate, adminNumber } from "@/lib/admin/localization";

const pageSize = 25;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin(["SUPER_ADMIN"]);
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 100) ?? "";
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const where = {
    roles: { some: { role: { name: { in: [...adminRoles] } } } },
    ...(query
      ? {
          OR: [
            { email: { contains: query } },
            { fullName: { contains: query } },
          ],
        }
      : {}),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { email: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  const activeSuperAdmins = await prisma.user.count({
    where: {
      isActive: true,
      roles: { some: { role: { name: "SUPER_ADMIN" } } },
    },
  });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-neutral-500">الأمان</p>
        <h2 className="mt-2 text-3xl font-semibold">إدارة المسؤولين</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          أنشئ حسابات الموظفين وحدد أدوارهم أو أوقف صلاحية الدخول. تُخزّن كلمات المرور بصورة مشفرة ولا تُعرض هنا.
        </p>
      </header>

      <Card className="p-5 sm:p-7">
        <h3 className="mb-5 text-lg font-semibold">إنشاء حساب مسؤول</h3>
        <CreateAdminUserForm />
      </Card>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 p-5">
          <div>
            <h3 className="text-lg font-semibold">حسابات المسؤولين</h3>
            <p className="mt-1 text-xs text-neutral-500">{adminNumber(activeSuperAdmins)} مسؤول نظام نشط</p>
          </div>
          <form action="/admin/users" className="flex gap-2">
            <label htmlFor="admin-user-search" className="sr-only">البحث عن المسؤولين</label>
            <input id="admin-user-search" name="q" defaultValue={query} maxLength={100} placeholder="الاسم أو البريد الإلكتروني" className="min-h-10 w-52 rounded-xl border border-neutral-300 px-3 text-sm" />
            <button className="min-h-10 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white">بحث</button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th scope="col" className="px-5 py-3">المسؤول</th>
                <th scope="col" className="px-5 py-3">تاريخ الإنشاء</th>
                <th scope="col" className="px-5 py-3">الأدوار والصلاحيات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const roles = user.roles.map(({ role }) => role.name).filter(isAdminRole);
                return (
                  <tr key={user.id} className="border-t border-neutral-100 align-top">
                    <td className="min-w-56 px-5 py-4">
                      <span className="block font-medium">{user.fullName}</span>
                      <span dir="ltr" className="mt-1 block text-right text-xs text-neutral-500">{user.email}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-neutral-600">{adminDate(user.createdAt)}</td>
                    <td className="px-5 py-4">
                      <AdminUserRolesForm userId={user.id} roles={roles} isActive={user.isActive} />
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-12 text-center text-neutral-500">لا توجد حسابات مسؤولين تطابق البحث.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-4 text-xs text-neutral-600">
          <span>{total ? `عرض ${adminNumber((page - 1) * pageSize + 1)}–${adminNumber(Math.min(page * pageSize, total))} من ${adminNumber(total)} مسؤول` : "لا يوجد مسؤولون"}</span>
          <div className="flex gap-2">
            {page > 1 && <a href={`/admin/users?page=${page - 1}${query ? `&q=${encodeURIComponent(query)}` : ""}`} className="rounded-lg border border-neutral-300 px-3 py-2">السابق</a>}
            {page < pageCount && <a href={`/admin/users?page=${page + 1}${query ? `&q=${encodeURIComponent(query)}` : ""}`} className="rounded-lg border border-neutral-300 px-3 py-2">التالي</a>}
          </div>
        </div>
      </Card>
    </div>
  );
}
