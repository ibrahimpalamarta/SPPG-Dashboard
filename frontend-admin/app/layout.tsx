import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashboard SPPG — Backoffice",
  description:
    "Backoffice dan dashboard internal program Makan Bergizi Gratis (MBG).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
