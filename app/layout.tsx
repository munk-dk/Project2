import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: {
    default: "Politisk Radar",
    template: "%s · Politisk Radar",
  },
  description:
    "Et gratis, åbent værktøj der gør Folketingets afstemningsdata tilgængeligt for alle danskere.",
  openGraph: {
    title: "Politisk Radar",
    description:
      "Søg politikere og emner og se hvordan Folketinget har stemt.",
    locale: "da_DK",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <body className="min-h-screen bg-muted/30">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
