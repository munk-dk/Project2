import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ladepause — gode pausesteder ved Superchargere",
  description:
    "Find de bedste steder at holde din 30-40 minutters ladepause — vurderet på toiletter, mad, indkøb og hvad stedet er godt til.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🔌</span>
              <span className="text-lg font-semibold tracking-tight">Ladepause</span>
            </Link>
            <span className="text-sm text-slate-500">DK + Nordtyskland · Tesla Superchargere</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-slate-400">
          Proof of Concept. Statiske ladeinfo — ingen live-status. Resuméer genereret med Claude ud
          fra Google Places- og OpenStreetMap-data.
        </footer>
      </body>
    </html>
  );
}
