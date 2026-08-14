import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashboard SPPG",
  description:
    "Portal transparansi program Makan Bergizi Gratis (MBG) — data operasional, gizi, dan penyaluran dari dapur SPPG.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
