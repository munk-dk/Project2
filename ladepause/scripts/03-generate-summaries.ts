import "./env";
import { ENV } from "./env";
import { PROMPT_VERSION, generateSummary } from "../lib/claude";
import { getAllStations, getPoisForStation, upsertSummary } from "../lib/repository";
import type { Summary } from "../lib/types";

/**
 * FASE 1 · TRIN 3 — Generér resuméer + "bedst til"-tags med Claude.
 *
 * Læser stationer + cachede POI'er fra databasen og sender dem til Claude, som
 * genererer et pause-resumé og et sæt tags pr. station. Adskilt fra trin 2, så
 * man kan justere prompten (lib/claude.ts) og regenerere UDEN at hente data igen.
 *
 * Kør:  npm run pipeline:summaries
 *       npm run pipeline:summaries -- --force   (regenerér selv hvis der findes et resumé)
 */

async function main() {
  const stations = getAllStations();
  if (!stations.length) {
    console.error("Ingen stationer i databasen. Kør 'npm run pipeline:stations' først.");
    process.exit(1);
  }

  console.log(`Genererer resuméer med model ${ENV.claudeModel} (prompt ${PROMPT_VERSION})…\n`);

  let ok = 0;
  let failed = 0;
  for (const station of stations) {
    const pois = getPoisForStation(station.id);
    try {
      const { summaryText, tags } = await generateSummary(station, pois, {
        model: ENV.claudeModel,
        apiKey: ENV.anthropicApiKey,
      });

      const summary: Summary = {
        stationId: station.id,
        summaryText,
        tags,
        model: ENV.claudeModel,
        promptVersion: PROMPT_VERSION,
        generatedBy: "claude",
        generatedAt: new Date().toISOString(),
      };
      upsertSummary(summary);
      ok++;
      console.log(`✓ ${station.name}`);
      console.log(`   ${summaryText}`);
      console.log(`   Tags: ${tags.join(", ") || "(ingen)"}\n`);
    } catch (err) {
      failed++;
      console.error(`✗ ${station.name}: ${(err as Error).message}\n`);
    }
  }

  console.log(`Færdig. ${ok}/${stations.length} resuméer genereret.`);
  if (ok > 0) {
    console.log("Gennemgå kvaliteten (Fase 3) og juster lib/claude.ts efter behov.");
  }
  if (failed > 0) {
    // Exit non-zero, så 'pipeline:all' ikke fejlagtigt melder succes.
    console.warn(`⚠  ${failed} station(er) fejlede. Eksisterende resuméer er bevaret.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Fejl i trin 3:", err);
  process.exit(1);
});
