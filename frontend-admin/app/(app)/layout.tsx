import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getMe } from "@/lib/me";
import { NAV } from "@/lib/nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await getMe();
  const items = NAV.filter((n) => me.permissions.includes(n.permission));
  const user = { name: me.fullName ?? me.email ?? "Pengguna", email: me.email, role: me.role };

  return (
    <div className="flex min-h-screen bg-[#f7f8fa] text-slate-900">
      <AppSidebar items={items} user={user} kitchens={me.kitchens} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader items={items} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
