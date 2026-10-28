import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Dashboard SPPG — Backoffice",
  description:
    "Backoffice dan dashboard internal program Makan Bergizi Gratis (MBG).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body className={roboto.className}>{children}</body>
    </html>
  );
}
