import type { Metadata } from "next";
import { BatchList } from "@/components/mapping/batch-list";
import { requirePage } from "@/lib/guard";

export const metadata: Metadata = { title: "Upload History · SPPG Internal" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ listPage?: string; kitchenId?: string; domain?: string; status?: string }>;
}) {
  const [me, { listPage, ...filters }] = await Promise.all([requirePage("/upload-history"), searchParams]);
  return <BatchList history page={Number(listPage) || 1} canDelete={false} filters={filters} kitchens={me.kitchens} />;
}
