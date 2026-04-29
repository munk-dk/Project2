import Link from "next/link";
import { Calendar, MapPin, ShieldCheck } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";

const POPULAERE_SOEGNINGER = [
  "Panodil",
  "Ibuprofen",
  "Simvastatin",
  "Pinex",
  "Metformin",
];

const FORKLARINGER = [
  {
    icon: MapPin,
    titel: "Samme pris på alle apoteker",
    tekst:
      "Lægemiddelstyrelsen sætter prisen — det er den samme på Matas, Apopro og det lokale apotek.",
  },
  {
    icon: Calendar,
    titel: "Skifter hver 14. dag",
    tekst:
      "Priserne genforhandles to gange om måneden. Det billigste alternativ kan godt skifte navn fra gang til gang.",
  },
  {
    icon: ShieldCheck,
    titel: "Apoteket skal tilbyde det billigste",
    tekst:
      "Loven siger apoteket skal tilbyde dig den billigste pakning med samme virkning — du skal bare bede om det.",
  },
];

export default function HomePage() {
  return (
    <div className="bg-gradient-to-b from-brand-50/40 via-surface-soft to-surface-soft">
      <section className="container-page py-12 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 inline-block rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-800">
            Gratis og uafhængigt
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Hvad hedder din medicin?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-muted">
            Find det billigste alternativ med samme virkning — og forstå dit
            tilskud uden indviklet apotekssprog.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <SearchBar size="large" />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-ink-subtle">Prøv:</span>
            {POPULAERE_SOEGNINGER.map((q) => (
              <Link
                key={q}
                href={`/soeg?q=${encodeURIComponent(q)}`}
                className="rounded-full border border-line bg-white px-3 py-1 text-ink-muted transition hover:border-brand-400 hover:text-brand-700"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <ul className="grid gap-4 sm:grid-cols-3">
          {FORKLARINGER.map(({ icon: Icon, titel, tekst }) => (
            <li
              key={titel}
              className="rounded-2xl border border-line bg-white p-6 shadow-soft"
            >
              <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <Icon className="size-6" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold text-ink">{titel}</h2>
              <p className="mt-1 text-ink-muted">{tekst}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page pb-20">
        <div className="rounded-2xl border border-line bg-white p-8 shadow-soft sm:p-10">
          <h2 className="text-2xl font-bold text-ink">Sådan bruger du Medicinhjælper</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            <li>
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                1
              </span>
              <h3 className="mt-3 text-lg font-semibold text-ink">Søg din medicin</h3>
              <p className="mt-1 text-ink-muted">
                Skriv navnet på din pakning — fx Panodil eller varenummeret.
              </p>
            </li>
            <li>
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                2
              </span>
              <h3 className="mt-3 text-lg font-semibold text-ink">Se alternativer</h3>
              <p className="mt-1 text-ink-muted">
                Vi grupperer pakninger med samme indholdsstof, så du kan
                sammenligne pris.
              </p>
            </li>
            <li>
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                3
              </span>
              <h3 className="mt-3 text-lg font-semibold text-ink">Bed om den billigste</h3>
              <p className="mt-1 text-ink-muted">
                På apoteket: bed om den billigste pakning — det er din ret efter
                substitutionsreglerne.
              </p>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
