import type { Metadata } from "next";
import { AuthCard } from "@/components/ui/form";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Lupa Kata Sandi · SPPG Internal", robots: { index: false } };

export default function Page() {
  return (
    <AuthCard title="Lupa kata sandi">
      <ForgotForm />
    </AuthCard>
  );
}
