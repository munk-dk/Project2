import { config } from "dotenv";
import path from "node:path";

// Indlæs .env.local (og .env) så scripts kan køre uden for Next.js-runtime.
config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

export const ENV = {
  ocmApiKey: process.env.OCM_API_KEY || undefined,
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || undefined,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
  poiRadiusMeters: Number(process.env.POI_RADIUS_METERS || 700),
  claudeModel: process.env.CLAUDE_MODEL || "claude-opus-5",
};
