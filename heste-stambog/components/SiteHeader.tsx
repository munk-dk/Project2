import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">🐎</span>
          <span>Heste Stambog</span>
        </Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Søg
          </Link>
          <Link href="/search?type=ueln" className="hover:text-foreground">
            Verificér UELN
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
          Data fra Equinet/SEGES, FEI m.fl. — leveret som-er. Heste Stambog er
          et uafhængigt værktøj uden tilknytning til de pågældende registre.
        </p>
      </div>
    </footer>
  );
}
