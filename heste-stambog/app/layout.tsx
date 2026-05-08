import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: {
    default: "Heste Stambog & ID-Verificering",
    template: "%s · Heste Stambog",
  },
  description:
    "Slå danske og internationale heste op, verificér deres identitet på tværs af registre og se konkurrencehistorik.",
  openGraph: {
    title: "Heste Stambog & ID-Verificering",
    description:
      "Søg en hest, verificér dens identitet, se stamtræ og konkurrencer.",
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
