import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
        404
      </p>
      <h1 className="mt-2 text-3xl font-bold text-ink">Vi kunne ikke finde siden</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-muted">
        Linket virker måske ikke længere, eller medicinen findes ikke i
        Lægemiddelstyrelsens database.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-700"
      >
        Tilbage til forsiden
      </Link>
    </div>
  );
}
