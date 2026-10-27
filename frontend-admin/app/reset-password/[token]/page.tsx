import type { Metadata } from "next";
import { AuthCard } from "@/components/ui/form";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Atur Password · SPPG Internal", robots: { index: false } };

export default async function Page({ params }: PageProps<"/reset-password/[token]">) {
  const { token } = await params;
  return (
    <AuthCard title="Atur password">
      <ResetForm token={token} />
    </AuthCard>
  );
}
