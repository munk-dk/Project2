import "./env";
import fs from "node:fs";
import path from "node:path";
import { getStations } from "../lib/stations";

/**
 * Hjælpe-script: eksportér den nuværende database til data/sample-enriched.json.
 *
 * Brug det når du har kørt hele pipelinen mod rigtige API'er og vil committe et
 * opdateret, menneskelæsbart øjebliksbillede, som webappen kan vise UDEN at man
 * skal køre pipelinen (og som er let at gennemgå i Fase 3 / i en PR).
 *
 * Kør:  npm run pipeline:export
 */

const OUT = path.join(process.cwd(), "data", "sample-enriched.json");

function main() {
  const stations = getStations();
  fs.writeFileSync(OUT, JSON.stringify(stations, null, 2) + "\n", "utf-8");
  console.log(`✓ Eksporterede ${stations.length} stationer til ${path.relative(process.cwd(), OUT)}`);
}

main();
