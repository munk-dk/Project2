import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { TOPICS } from "@/lib/topics";

export const metadata = {
  title: "Alle emner",
};

export default function TopicsPage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Udforsk emner
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Kig ind på et emne for at se hvilke sager der har været til afstemning
          og hvordan partierne samlet har stemt.
        </p>
        <div className="mt-4 max-w-xl">
          <SearchBar />
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {TOPICS.map((t) => (
            <Link
              key={t.slug}
              href={`/emne/${t.slug}`}
              className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl" aria-hidden>
                  {t.emoji}
                </div>
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
