import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-xl border border-border bg-white p-10 text-center shadow-sm">
      <h1 className="text-2xl font-bold">Siden blev ikke fundet</h1>
      <p className="mt-2 text-muted-foreground">
        Den politiker, afstemning eller det emne du ledte efter findes ikke.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        Tilbage til forsiden
      </Link>
    </div>
  );
}
