import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar, type NavItem } from "@/components/layout/app-sidebar";
import { I18nProvider } from "@/components/i18n-provider";
import { getLang, getT } from "@/lib/lang-server";
import { getMe } from "@/lib/me";
import { NAV, canOpen } from "@/lib/nav";
import { ROLE_LABELS } from "@/lib/roles";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await getMe();
  const [lang, t] = await Promise.all([getLang(), getT()]);
  const items: NavItem[] = NAV.filter((n) => !("hidden" in n) && canOpen(n, me)).map((n) => ({ ...n, label: t(n.label) }));
  const user = { name: me.fullName ?? t(ROLE_LABELS[me.role]), email: me.email, role: me.role };

  return (
    <I18nProvider lang={lang}>
    <div className="flex min-h-screen bg-[#f7f8fa] text-slate-900">
      <AppSidebar items={items} user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader items={items} user={user} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
    </I18nProvider>
  );
}
