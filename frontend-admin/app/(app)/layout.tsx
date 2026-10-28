import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar, type NavItem } from "@/components/layout/app-sidebar";
import { getMe } from "@/lib/me";
import { NAV, canOpen } from "@/lib/nav";
import { ROLE_LABELS } from "@/lib/roles";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await getMe();
  const items: NavItem[] = NAV.filter((n) => canOpen(n, me));
  const user = { name: me.fullName ?? ROLE_LABELS[me.role], email: me.email, role: me.role };

  return (
    <div className="flex min-h-screen bg-[#f7f8fa] text-slate-900">
      <AppSidebar items={items} user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader items={items} isPm={me.role === "SUPER_ADMIN"} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
