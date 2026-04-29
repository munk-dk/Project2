// Domænetyper for Medicinhjælper. Disse er den normaliserede form vi bruger
// internt i UI'et — API'ets råresponse mappes ind i disse via lib/medicine.ts.

export type SubstitutionCategory = "A" | "B" | "C" | null;

export interface Medicine {
  /** 6-cifret varenummer (unik nøgle pr. pakning) */
  varenummer: string;
  /** Handelsnavn fx "Panodil" eller "Pinex" */
  navn: string;
  /** Producent / firmanavn */
  firma: string | null;
  /** ATC-kode — fx "N02BE01" for paracetamol */
  atc: string | null;
  /** Indholdsstof i klart sprog — fx "Paracetamol" */
  indholdsstof: string | null;
  /** Styrke — fx "500 mg" */
  styrke: string | null;
  /** Lægemiddelform — fx "tabletter", "kapsler" */
  form: string | null;
  /** Pakningsstørrelse — fx "20 stk" */
  pakning: string | null;
  /** Forbrugerpris i hele kroner (det kunden betaler i kassen) */
  prisKr: number | null;
  /** Pris pr. enhed (tablet/ml/g) i kroner — til sammenligning på tværs af pakninger */
  prisPrEnhedKr: number | null;
  /** Substitutionsgruppe — alle pakninger i samme gruppe kan erstatte hinanden */
  substitutionsgruppe: string | null;
  /** A = billigste, B = inden for 5 kr af billigste, C = dyrere */
  abc: SubstitutionCategory;
  /** Er der tilskud til præparatet? */
  tilskud: boolean;
  /** Pris efter tilskud (hvis kendt og hvis brugeren har grundtilskud) */
  prisMedTilskudKr: number | null;
  /** Er det originalpræparat (ikke generisk kopi) */
  erOriginal: boolean;
  /** Receptpligtigt? */
  recept: boolean;
  /** Link til indlægsseddel hos Lægemiddelstyrelsen, hvis tilgængeligt */
  indlaegsseddelUrl: string | null;
  /** Tilskudskode fra Lægemiddelstyrelsen — fx "A" = generelt tilskud */
  tilskudKode: string | null;
  /** Forklarende tilskudstekst — fx "Generelt tilskud", "Klausuleret tilskud" */
  tilskudTekst: string | null;
  /** Indikation — hvad medicinen er til, fx "mod smerter, febernedsættende" */
  indikation: string | null;
  /** Dosering i fri tekst */
  dosering: string | null;
  /** Trafikadvarsel — påvirker det evnen til at køre? */
  trafikAdvarsel: boolean;
  /** Er pakningen udgået? */
  udgaaet: boolean;
  /** Varenumre på substitutioner — udfyldes når detaljer hentes */
  substitutionsVarenumre: string[];
}

/** En substitutionsgruppe — alle pakninger i gruppen har samme virkning */
export interface MedicineGroupData {
  /** Stabil nøgle — fx ATC + styrke + form + pakning */
  key: string;
  /** Klart navn på indholdsstoffet — fx "Paracetamol 500 mg, 20 tabletter" */
  overskrift: string;
  /** ATC-kode hvis kendt */
  atc: string | null;
  /** Original (mærkevare) hvis vi kunne identificere den */
  original: Medicine | null;
  /** Generiske alternativer — sorteret med billigste først */
  alternativer: Medicine[];
  /** Den absolut billigste pakning i gruppen */
  billigste: Medicine | null;
  /** Den dyreste — bruges til at beregne maksimal besparelse */
  dyreste: Medicine | null;
  /** Besparelse i kroner ved at vælge billigste fremfor dyreste */
  maxBesparelseKr: number;
  /** Besparelse i procent ved at vælge billigste fremfor original */
  besparelseProcent: number | null;
}
