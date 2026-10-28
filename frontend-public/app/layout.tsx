import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Dashboard SPPG",
  description:
    "Portal transparansi program Makan Bergizi Gratis (MBG) — data operasional, gizi, dan penyaluran dari dapur SPPG.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body className={roboto.className}>{children}</body>
    </html>
  );
}
