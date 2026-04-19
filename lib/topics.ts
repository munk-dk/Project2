// Kuraterede emner der fungerer som indgang til afstemningsdata.
// Hvert emne har et slug (bruges i URL), et display-navn og en
// kort beskrivelse. Søgetermerne bruges til at finde sager i ODA.

export interface Topic {
  slug: string;
  name: string;
  description: string;
  emoji?: string;
}

export const TOPICS: Topic[] = [
  {
    slug: "klima",
    name: "Klima og miljø",
    description: "Klimaforandringer, CO₂, grøn omstilling og natur",
    emoji: "🌍",
  },
  {
    slug: "skat",
    name: "Skat og afgifter",
    description: "Indkomstskat, moms, afgifter og skattelempelser",
    emoji: "💰",
  },
  {
    slug: "sundhed",
    name: "Sundhed",
    description: "Sundhedsvæsen, sygehuse og sundhedspolitik",
    emoji: "🏥",
  },
  {
    slug: "udlaendinge",
    name: "Udlændinge og integration",
    description: "Asyl, indvandring, statsborgerskab og integration",
    emoji: "🛂",
  },
  {
    slug: "forsvar",
    name: "Forsvar og sikkerhed",
    description: "Forsvar, militær, sikkerhed og beredskab",
    emoji: "🛡️",
  },
  {
    slug: "uddannelse",
    name: "Uddannelse",
    description: "Folkeskole, ungdomsuddannelser og videregående",
    emoji: "🎓",
  },
  {
    slug: "bolig",
    name: "Bolig",
    description: "Boligpolitik, lejere, boligstøtte og byggeri",
    emoji: "🏠",
  },
  {
    slug: "transport",
    name: "Transport",
    description: "Veje, jernbaner, kollektiv transport og biler",
    emoji: "🚆",
  },
  {
    slug: "retspolitik",
    name: "Retspolitik",
    description: "Straf, politi, domstole og kriminalitet",
    emoji: "⚖️",
  },
  {
    slug: "arbejdsmarked",
    name: "Arbejdsmarked",
    description: "Løn, dagpenge, ferie og arbejdsforhold",
    emoji: "👷",
  },
  {
    slug: "landbrug",
    name: "Landbrug og fødevarer",
    description: "Landbrug, fødevarer og dyrevelfærd",
    emoji: "🌾",
  },
  {
    slug: "aeldre",
    name: "Ældre",
    description: "Pension, ældrepleje og seniorpolitik",
    emoji: "👵",
  },
];

export function topicBySlug(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

// Søgetermer pr. slug — nogle emner har flere søgeord.
const SEARCH_TERMS: Record<string, string[]> = {
  klima: ["klima", "CO2", "grøn"],
  skat: ["skat", "afgift", "moms"],
  sundhed: ["sundhed", "sygehus", "patient"],
  udlaendinge: ["udlænding", "indvandr", "asyl", "statsborger"],
  forsvar: ["forsvar", "militær", "våben"],
  uddannelse: ["uddannelse", "folkeskole", "gymnasium", "universitet"],
  bolig: ["bolig", "leje", "byggeri"],
  transport: ["transport", "vej", "bane", "bil"],
  retspolitik: ["straf", "politi", "domstol", "kriminalitet"],
  arbejdsmarked: ["dagpenge", "arbejds", "løn"],
  landbrug: ["landbrug", "fødevare", "dyrevelfærd"],
  aeldre: ["pension", "ældre", "senior"],
};

export function searchTermsForTopic(slug: string): string[] {
  return SEARCH_TERMS[slug] ?? [slug.replace(/-/g, " ")];
}
