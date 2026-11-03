import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { getT } from "@/lib/lang-server";
import { BatchList } from "@/components/mapping/batch-list";
import { EmptyState } from "@/components/ui/empty-state";
import { UploadForm } from "./upload-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT())("Unggah Data")} · SPPG Internal` };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ listPage?: string; kitchenId?: string; domain?: string; status?: string }>;
}) {
  const [[me, t], { listPage, ...filters }] = await Promise.all([Promise.all([requirePage("/unggah-data"), getT()]), searchParams]);

  return (
    <div className="mx-auto max-w-400 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t("Unggah Data")}</h1>
        <p className="mt-1 text-slate-500">{t("Unggah file Excel dari dapur. Sistem akan membaca dan mengecek isinya.")}</p>
      </div>
      {me.kitchens.length === 0 ? (
        <EmptyState title={t("Belum ada dapur")}>
          <p>{t("Akun Anda belum ditautkan ke dapur mana pun. Hubungi Admin.")}</p>
        </EmptyState>
      ) : (
        <>
          <UploadForm kitchens={me.kitchens} kitchenId={me.kitchens[0]?.id} />
          <BatchList compact page={Number(listPage) || 1} canDelete={me.permissions.includes("batch:publish")} filters={filters} kitchens={me.kitchens} />
        </>
      )}
    </div>
  );
}
