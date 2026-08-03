import Anthropic from "@anthropic-ai/sdk";
import type { Poi, Station, TagKey } from "./types";
import { TAGS, TAG_KEYS, isTagKey } from "./types";

/**
 * Claude-klient til at generere pause-resuméer + "bedst til"-tags pr. station.
 *
 * Bevidst adskilt fra dataindsamlingen (Fase 1, trin 1-2), så resuméer kan
 * regenereres uden at hente rådata igen — man justerer bare prompten her og
 * kører scripts/03-generate-summaries.ts.
 */

// Versionsstreng, så vi kan se hvilken prompt der genererede et givet resumé.
// Bump denne når prompten ændres væsentligt.
export const PROMPT_VERSION = "2026-08-03-v1";

export interface GeneratedSummary {
  summaryText: string;
  tags: TagKey[];
}

const SYSTEM_PROMPT = `Du hjælper elbilister med at vurdere ladestop. En bruger holder typisk 25-40 minutters pause mens bilen lader. Din opgave er at skrive et kort, ærligt og brugbart resumé af HVAD STEDET ER GODT TIL som pausested — ikke om selve ladningen (antal ledige standere er irrelevant her).

Skriv på dansk, i en nøgtern og konkret tone. 2-4 sætninger. Fremhæv det der betyder noget for en pause: toiletter, mad/kaffe, indkøb, om børn kan strække ben, ro/støj, og om stedet kan blive travlt. Vær ærlig — hvis noget er middelmådigt eller mangler, så sig det. Overdriv ikke, og find ikke på faciliteter der ikke fremgår af data.

Skriv KUN ud fra de oplysninger du får. Hvis datagrundlaget er tyndt, så skriv et kortere, mere forbeholdent resumé frem for at gætte.`;

// JSON-schema for det strukturerede svar. Tags begrænses til det faste sæt.
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      description:
        "2-4 sætningers resumé på dansk af hvad stedet er godt til som pausested.",
    },
    tags: {
      type: "array",
      description: "De 'bedst til'-tags der passer. Kun dem der reelt understøttes af data.",
      items: { type: "string", enum: [...TAG_KEYS] },
    },
  },
  required: ["summary", "tags"],
} as const;

function poiLine(p: Poi): string {
  const bits: string[] = [`- ${p.name} (${p.category}, ~${p.distanceMeters} m)`];
  if (p.rating != null) {
    bits.push(`rating ${p.rating}${p.userRatingsTotal ? `/${p.userRatingsTotal} anm.` : ""}`);
  }
  let line = bits.join(", ");
  if (p.reviews && p.reviews.length) {
    const quotes = p.reviews.map((r) => `"${r.replace(/\s+/g, " ").slice(0, 160)}"`).join("; ");
    line += `\n    Anmeldelser: ${quotes}`;
  }
  return line;
}

export function buildUserPrompt(station: Station, pois: Poi[]): string {
  const header = `LADESTATION: ${station.name}
Adresse: ${station.address}
Effekt: ${station.powerKw ? `${station.powerKw} kW` : "ukendt"}, ${station.connectorCount ?? "?"} standere`;

  if (!pois.length) {
    return `${header}\n\nNærliggende steder: (ingen POI-data fundet inden for radius)\n\nSkriv et kort, forbeholdent resumé og vælg kun tags der er oplagte givet placeringen.`;
  }

  const sorted = [...pois].sort((a, b) => a.distanceMeters - b.distanceMeters);
  const list = sorted.map(poiLine).join("\n");

  const tagLegend = TAG_KEYS.map((k) => `${k} (${TAGS[k].label})`).join(", ");

  return `${header}

Nærliggende steder inden for gåafstand (sorteret efter afstand):
${list}

Skriv resuméet, og vælg de "bedst til"-tags fra dette faste sæt der reelt understøttes af data ovenfor: ${tagLegend}.`;
}

interface GenerateOptions {
  model?: string;
  apiKey?: string;
}

/**
 * Genererer resumé + tags for én station. Kaster ved API-fejl, så kalderen
 * kan logge og fortsætte med næste station.
 */
export async function generateSummary(
  station: Station,
  pois: Poi[],
  opts: GenerateOptions = {},
): Promise<GeneratedSummary> {
  // Konstruktøren uden apiKey henter selv fra ANTHROPIC_API_KEY eller en
  // `ant auth login`-profil.
  const client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
  const model = opts.model ?? process.env.CLAUDE_MODEL ?? "claude-opus-5";

  const response = await client.messages.create({
    model,
    max_tokens: 2000,
    // Summarisering er ikke tung ræsonnering; medium effort holder omkostning
    // og latens nede på et batch-job uden at gå på kompromis med kvaliteten.
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(station, pois) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returnerede intet tekst-svar");
  }

  const parsed = JSON.parse(textBlock.text) as { summary: string; tags: string[] };
  const tags = (parsed.tags ?? []).filter(isTagKey);

  return { summaryText: parsed.summary.trim(), tags };
}
