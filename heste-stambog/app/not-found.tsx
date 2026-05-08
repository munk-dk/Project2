import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-lg border border-border bg-white p-8 text-center">
      <h1 className="text-2xl font-bold">Ikke fundet</h1>
      <p className="mt-2 text-muted-foreground">
        Vi kunne ikke finde den side eller hest, du leder efter.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Tilbage til søgning
      </Link>
    </div>
  );
}
