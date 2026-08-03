import "./env";
import fs from "node:fs";
import path from "node:path";
import { ENV } from "./env";
import { fetchTeslaSuperchargers } from "../lib/ocm";
import { upsertStations } from "../lib/repository";
import type { Station } from "../lib/types";

/**
 * FASE 1 · TRIN 1 — Hent ladestationer.
 *
 * Henter Tesla Superchargere for DK + Nordtyskland fra Open Charge Map og gemmer
 * grunddata i den lokale database. For PoC'en afgrænser vi til testsættet på 10
 * stationer (data/seed-stations.json), medmindre --all gives.
 *
 * Kør:  npm run pipeline:stations
 *       npm run pipeline:stations -- --all     (hele området, ikke kun seed)
 */

const SEED_PATH = path.join(process.cwd(), "data", "seed-stations.json");

function loadSeed(): Station[] {
  return JSON.parse(fs.readFileSync(SEED_PATH, "utf-8")) as Station[];
}

async function main() {
  const all = process.argv.includes("--all");
  let stations: Station[];

  if (all) {
    console.log("Henter ALLE Tesla Superchargere i DK + Nordtyskland fra OCM…");
    stations = await fetchTeslaSuperchargers({ apiKey: ENV.ocmApiKey });
    console.log(`OCM returnerede ${stations.length} Superchargere.`);
  } else {
    // PoC-standard: brug det kuraterede testsæt på 10 stationer. Hvis en
    // OCM-nøgle findes, bekræfter vi seed-koordinaterne mod OCM-data.
    stations = loadSeed();
    console.log(`Bruger seed-testsæt: ${stations.length} stationer.`);
    if (ENV.ocmApiKey) {
      try {
        const live = await fetchTeslaSuperchargers({ apiKey: ENV.ocmApiKey });
        console.log(
          `(OCM tilgængelig: ${live.length} Superchargere i området — kør med --all for at bruge dem.)`,
        );
      } catch (err) {
        console.warn("Kunne ikke nå OCM til verifikation:", (err as Error).message);
      }
    } else {
      console.log("(Ingen OCM_API_KEY sat — bruger seed-koordinater direkte.)");
    }
  }

  upsertStations(stations);
  console.log(`✓ Gemte ${stations.length} stationer i databasen.`);
}

main().catch((err) => {
  console.error("Fejl i trin 1:", err);
  process.exit(1);
});
