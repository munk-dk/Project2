import "./env";
import { ENV } from "./env";
import { fetchNearbyPois } from "../lib/places";
import { fetchOsmPois } from "../lib/overpass";
import { getAllStations, getPoisForStation, replacePoisForStation } from "../lib/repository";
import type { Poi } from "../lib/types";

/**
 * FASE 1 · TRIN 2 — Hent POI'er pr. station.
 *
 * For hver station kaldes Google Places (Nearby Search + anmeldelser) ÉN gang og
 * suppleres med gratis OSM/Overpass-data (toiletter, legepladser, hundeområder).
 * Resultatet caches i databasen og genbruges — der kaldes ALDRIG live fra appen.
 *
 * OMKOSTNING: Google Places koster penge pr. kald. Scriptet springer stationer
 * over der allerede har POI'er (medmindre --force), så genkørsler ikke brænder
 * kvote. Husk budgetloftet på $10 i Google Cloud.
 *
 * Kør:  npm run pipeline:pois
 *       npm run pipeline:pois -- --force       (hent igen selv hvis cachet)
 *       npm run pipeline:pois -- --osm-only    (spring Google over, kun gratis OSM)
 */

async function main() {
  const force = process.argv.includes("--force");
  const osmOnly = process.argv.includes("--osm-only");
  const stations = getAllStations();

  if (!stations.length) {
    console.error("Ingen stationer i databasen. Kør 'npm run pipeline:stations' først.");
    process.exit(1);
  }

  if (!ENV.googlePlacesApiKey && !osmOnly) {
    console.warn(
      "⚠  Ingen GOOGLE_PLACES_API_KEY sat — kører i --osm-only-tilstand (kun gratis OSM-data).",
    );
  }
  const useGoogle = Boolean(ENV.googlePlacesApiKey) && !osmOnly;

  let googleCalls = 0;
  let failed = 0;
  for (const station of stations) {
    if (!force && getPoisForStation(station.id).length > 0) {
      console.log(`· ${station.name}: allerede cachet, springer over (--force for at hente igen).`);
      continue;
    }

    const pois: Poi[] = [];
    // Hold styr på om mindst én kilde faktisk svarede. Hvis alle kilder fejler
    // (netværk, kvote, rate limit), må vi IKKE skrive et tomt resultat — det
    // ville slette dyre, cachede Google-data på grund af en forbigående fejl.
    let anySourceSucceeded = false;

    if (useGoogle) {
      try {
        const g = await fetchNearbyPois(station, {
          apiKey: ENV.googlePlacesApiKey!,
          radiusMeters: ENV.poiRadiusMeters,
        });
        googleCalls++;
        anySourceSucceeded = true;
        pois.push(...g);
        console.log(`  Google: ${g.length} POI'er for ${station.name}`);
      } catch (err) {
        console.warn(`  Google-fejl for ${station.name}:`, (err as Error).message);
      }
    }

    try {
      const osm = await fetchOsmPois(station, ENV.poiRadiusMeters);
      anySourceSucceeded = true;
      // Undgå dubletter (fx en park der findes begge steder) via grov navn+kategori-nøgle.
      const seen = new Set(pois.map((p) => `${p.category}:${p.name.toLowerCase()}`));
      const uniqueOsm = osm.filter((p) => !seen.has(`${p.category}:${p.name.toLowerCase()}`));
      pois.push(...uniqueOsm);
      console.log(`  OSM:    ${uniqueOsm.length} supplerende POI'er for ${station.name}`);
    } catch (err) {
      console.warn(`  OSM-fejl for ${station.name}:`, (err as Error).message);
    }

    if (!anySourceSucceeded) {
      console.warn(`✗ ${station.name}: alle kilder fejlede — beholder eksisterende cache.`);
      failed++;
      await sleep(1000);
      continue;
    }

    replacePoisForStation(station.id, pois);
    console.log(`✓ ${station.name}: gemte ${pois.length} POI'er.`);

    // Vær nænsom mod de gratis Overpass-servere.
    await sleep(1000);
  }

  console.log(`\nFærdig. Google Places-kald brugt i denne kørsel: ${googleCalls}.`);
  if (googleCalls > 0) {
    console.log("Husk at holde øje med forbruget i Google Cloud (budgetloft $10).");
  }
  if (failed > 0) {
    console.warn(
      `⚠  ${failed} station(er) kunne ikke hentes fra nogen kilde. Eksisterende data er bevaret — kør igen når kilderne er tilgængelige.`,
    );
    process.exitCode = 1;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("Fejl i trin 2:", err);
  process.exit(1);
});
