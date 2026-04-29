import Link from "next/link";
import { Pill } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-ink transition hover:text-brand-700"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <Pill className="size-5" aria-hidden />
          </span>
          <span className="text-xl">Medicinhjælper</span>
        </Link>
        <nav aria-label="Hovednavigation">
          <Link
            href="/"
            className="text-ink-muted transition hover:text-brand-700"
          >
            Forside
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface-soft">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-ink-muted sm:px-6">
        <p>
          <strong className="text-ink">Medicinhjælper</strong> er et uafhængigt,
          gratis værktøj. Data kommer fra{" "}
          <a
            href="https://medicinpriser.dk"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-700 underline hover:text-brand-800"
          >
            Lægemiddelstyrelsens medicinpriser
          </a>
          .
        </p>
        <p className="mt-2">
          Vi giver ikke medicinsk rådgivning. Spørg din læge eller dit apotek
          før du skifter præparat.
        </p>
      </div>
    </footer>
  );
}
