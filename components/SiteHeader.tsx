import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-full bg-red-500"
          />
          <span>Politisk Radar</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Forside
          </Link>
          <Link
            href="https://oda.ft.dk/Help"
            target="_blank"
            rel="noopener"
            className="hover:text-foreground"
          >
            Datakilde
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted-foreground">
        <p>
          Data fra{" "}
          <a
            href="https://oda.ft.dk/Help"
            target="_blank"
            rel="noopener"
            className="underline"
          >
            Folketingets Åbne Data (ODA)
          </a>
          . Politisk Radar er et gratis, uafhængigt værktøj.
        </p>
      </div>
    </footer>
  );
}
