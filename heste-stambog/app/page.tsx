import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";

export default function HomePage() {
  return (
    <div className="space-y-12 py-8">
      <section className="space-y-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Slå hesten op. Verificér dens identitet.
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Søg danske og internationale heste på tværs af Equinet/SEGES, FEI og
          flere registre. Få ét samlet billede af identitet, stambog og
          konkurrencehistorik.
        </p>
        <div className="mx-auto max-w-2xl">
          <SearchBar size="lg" />
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <Link
            href="/search?type=ueln"
            className="rounded-full border border-border bg-white px-3 py-1 text-muted-foreground hover:border-brand-400 hover:text-foreground"
          >
            Verificér et UELN
          </Link>
          <Link
            href="/search?type=ident"
            className="rounded-full border border-border bg-white px-3 py-1 text-muted-foreground hover:border-brand-400 hover:text-foreground"
          >
            Søg dansk hest
          </Link>
          <Link
            href="/search?type=feiid"
            className="rounded-full border border-border bg-white px-3 py-1 text-muted-foreground hover:border-brand-400 hover:text-foreground"
          >
            FEI-søgning
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Feature
          title="Aggregeret søgning"
          body="Vi rammer Equinet/SEGES og FEI parallelt og fletter resultaterne, så du kun ser hver hest én gang — uanset hvor mange registre den findes i."
        />
        <Feature
          title="Identitets­verifikation"
          body="Trafiklys-system viser om navn, fødselsår, chip, UELN og studbook stemmer overens på tværs af kilder."
        />
        <Feature
          title="Konkurrence­historik"
          body="Se FEI-resultater, niveau og placering — og krydscheck mod stambogsdata på samme side."
        />
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
