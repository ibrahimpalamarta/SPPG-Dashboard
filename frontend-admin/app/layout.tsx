import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { getLang } from "@/lib/lang-server";
import "./globals.css";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Dashboard SPPG — Backoffice",
  description:
    "Backoffice dan dashboard internal program Makan Bergizi Gratis (MBG).",
  // The app has its own ID/EN switch; browser auto-translate turns dapur names like "Sukun" into "Breadfruit".
  other: { google: "notranslate" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={await getLang()} translate="no">
      <body className={roboto.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
