import type { Metadata, Viewport } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Medicinhjælper — find billigere medicin",
    template: "%s · Medicinhjælper",
  },
  description:
    "Søg din medicin og find det billigste alternativ med samme virkning. Forstå dit tilskud — forklaret i klart dansk.",
  applicationName: "Medicinhjælper",
  authors: [{ name: "Medicinhjælper" }],
  openGraph: {
    title: "Medicinhjælper",
    description:
      "Find billigere medicin med samme virkning — forklaret i klart dansk.",
    locale: "da_DK",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#10B981",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
