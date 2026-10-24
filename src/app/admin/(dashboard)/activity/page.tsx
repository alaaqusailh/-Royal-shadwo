import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { adminDate, adminNumber } from "@/lib/admin/localization";

const pageSize = 50;

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin(["SUPER_ADMIN"]);

  const params = await searchParams;
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        details: true,
        ipAddress: true,
        createdAt: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.auditLog.count(),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div><p className="text-xs text-neutral-500">الأمان</p><h2 className="mt-2 text-3xl font-semibold">سجل النشاط</h2><p className="mt-2 text-sm text-neutral-500">التغييرات الإدارية المسجلة في قاعدة بيانات التدقيق.</p></div>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500"><tr><th className="px-5 py-3">التاريخ والوقت</th><th className="px-5 py-3">المسؤول</th><th className="px-5 py-3">الإجراء</th><th className="px-5 py-3">السجل</th><th className="px-5 py-3">التفاصيل</th></tr></thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-neutral-100 align-top">
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-neutral-600">{adminDate(entry.createdAt, true)}</td>
                  <td className="px-5 py-4"><span className="block font-medium">{entry.user?.fullName ?? "النظام"}</span>{entry.user?.email && <span dir="ltr" className="text-xs text-neutral-500">{entry.user.email}</span>}</td>
                  <td dir="ltr" className="px-5 py-4 text-right font-medium">{entry.action}</td>
                  <td className="px-5 py-4 text-neutral-600">{entry.entityType}{entry.entityId && <span dir="ltr" className="block max-w-40 truncate text-xs text-neutral-400">{entry.entityId}</span>}</td>
                  <td dir="ltr" className="max-w-80 break-all px-5 py-4 text-right text-xs text-neutral-600">{entry.details ? JSON.stringify(entry.details) : "—"}{entry.ipAddress && <span className="mt-1 block text-neutral-400">IP: {entry.ipAddress}</span>}</td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-neutral-500">لا توجد أنشطة إدارية مسجلة.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-4 text-xs text-neutral-600">
          <span>{total ? `عرض ${adminNumber((page - 1) * pageSize + 1)}–${adminNumber(Math.min(page * pageSize, total))} من ${adminNumber(total)} سجل` : "لا توجد سجلات"}</span>
          <div className="flex gap-2">
            {page > 1 && <a href={`/admin/activity?page=${page - 1}`} className="rounded-lg border border-neutral-300 px-3 py-2">السابق</a>}
            {page < pageCount && <a href={`/admin/activity?page=${page + 1}`} className="rounded-lg border border-neutral-300 px-3 py-2">التالي</a>}
          </div>
        </div>
      </Card>
    </div>
  );
}
