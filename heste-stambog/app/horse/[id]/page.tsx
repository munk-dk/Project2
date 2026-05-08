import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { VerificationLight } from "@/components/VerificationLights";
import { searchEquinet } from "@/lib/sources/equinet";
import { searchFei } from "@/lib/sources/fei";
import { buildHorse } from "@/lib/aggregate";
import { buildVerificationReport } from "@/lib/verify";
import { formatDate } from "@/lib/utils";
import type {
  DataSource,
  Horse,
  SourceHit,
  SourceName,
  VerificationReport,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SEX_LABEL: Record<string, string> = {
  stallion: "Hingst",
  mare: "Hoppe",
  gelding: "Vallak",
};

interface PageProps {
  params: { id: string };
}

async function loadHorse(
  id: string,
): Promise<
  | { horse: Horse; report: VerificationReport; sourceHits: SourceHit[] }
  | null
> {
  const [sourcePart, ...idParts] = id.split(":");
  const rawId = idParts.join(":");
  const source = sourcePart as SourceName;
  if (!source || !rawId) return null;

  const sources: DataSource[] = [];
  const allHits: SourceHit[] = [];

  try {
    const primary = await fetchPrimary(source, rawId);
    sources.push({
      name: source,
      fetchedAt: new Date().toISOString(),
      status: primary.length ? "ok" : "not_found",
      rawId,
    });
    allHits.push(...primary);
  } catch (err) {
    sources.push({
      name: source,
      fetchedAt: new Date().toISOString(),
      status: "error",
      message: err instanceof Error ? err.message : "Ukendt fejl",
    });
  }

  const primaryHit = allHits[0];
  if (primaryHit) {
    const targets: SourceName[] = source === "equinet" ? ["fei"] : ["equinet"];
    for (const target of targets) {
      try {
        const hits = await enrich(target, primaryHit);
        sources.push({
          name: target,
          fetchedAt: new Date().toISOString(),
          status: hits.length ? "ok" : "not_found",
        });
        allHits.push(...hits);
      } catch (err) {
        sources.push({
          name: target,
          fetchedAt: new Date().toISOString(),
          status: "error",
          message: err instanceof Error ? err.message : "Ukendt fejl",
        });
      }
    }
  }

  if (allHits.length === 0) return null;

  const horse = buildHorse(id, allHits, { sources });
  const sourceData: Partial<Record<SourceName, Partial<Horse>>> = {};
  for (const hit of allHits) {
    sourceData[hit.source] = {
      name: hit.name,
      birthYear: hit.birthYear,
      sex: hit.sex,
      ueln: hit.ueln,
      feiId: hit.feiId,
      danishIdent: hit.danishIdent,
      chipNumber: hit.chipNumber,
      studbook: hit.studbook,
      country: hit.country,
    };
  }
  const report = buildVerificationReport(horse, sourceData);
  return { horse, report, sourceHits: allHits };
}

async function fetchPrimary(
  source: SourceName,
  rawId: string,
): Promise<SourceHit[]> {
  if (source === "equinet")
    return searchEquinet({ type: "ident", query: rawId });
  if (source === "fei") return searchFei({ query: "", feiId: rawId });
  return [];
}

async function enrich(
  target: SourceName,
  primary: SourceHit,
): Promise<SourceHit[]> {
  if (target === "fei") {
    if (primary.feiId) return searchFei({ query: "", feiId: primary.feiId });
    if (primary.name) return searchFei({ query: primary.name });
    return [];
  }
  if (target === "equinet") {
    if (primary.danishIdent)
      return searchEquinet({ type: "ident", query: primary.danishIdent });
    if (primary.chipNumber)
      return searchEquinet({ type: "chip", query: primary.chipNumber });
    if (primary.name)
      return searchEquinet({ type: "name", query: primary.name });
    return [];
  }
  return [];
}

export default async function HorsePage({ params }: PageProps) {
  const id = decodeURIComponent(params.id);
  const data = await loadHorse(id);
  if (!data) notFound();
  const { horse, report } = data;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{horse.name}</h1>
          <VerificationLight status={horse.verificationStatus} />
        </div>
        <p className="text-muted-foreground">
          {[
            horse.birthYear,
            horse.sex ? SEX_LABEL[horse.sex] : null,
            horse.studbook,
            horse.country,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="flex flex-wrap gap-1">
          {horse.sources.map((s) => (
            <Badge
              key={s.name}
              tone={
                s.status === "ok"
                  ? "info"
                  : s.status === "not_found"
                    ? "unknown"
                    : "conflict"
              }
            >
              {s.name.toUpperCase()} · {s.status}
            </Badge>
          ))}
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identitet</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <Row label="UELN" value={horse.ueln} mono />
            <Row label="FEI ID" value={horse.feiId} mono />
            <Row label="Dansk ident" value={horse.danishIdent} mono />
            <Row label="Chip" value={horse.chipNumber} mono />
            <Row label="Stambog" value={horse.studbook} />
            <Row label="Stambogsnr." value={horse.studBookNumber} mono />
            <Row label="Pas" value={horse.passportStatus} />
            <Row label="Pasudsteder" value={horse.passportIssuingOrg} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blodlinje</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <Row label="Far (sire)" value={horse.sire?.name} />
            <Row label="Mor (dam)" value={horse.dam?.name} />
            <Row label="Morfar (dam sire)" value={horse.damSire?.name} />
            {!horse.sire && !horse.dam && (
              <p className="text-muted-foreground">
                Blodlinjedata er ikke tilgængelig fra de kilder vi har slået op.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verifikation</CardTitle>
        </CardHeader>
        <CardBody>
          {report.fields.length === 0 ? (
            <p className="text-muted-foreground">Ingen felter at sammenligne.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Felt</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Værdier pr. kilde</th>
                  </tr>
                </thead>
                <tbody>
                  {report.fields.map((f) => (
                    <tr key={f.field} className="border-b border-border/60">
                      <td className="py-2 pr-4 font-medium">{f.field}</td>
                      <td className="py-2 pr-4">
                        <AgreementBadge agreement={f.agreement} />
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {f.values.length === 0 ? (
                          <span>—</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {f.values.map((v) => (
                              <li key={v.source}>
                                <span className="font-mono">
                                  {v.source}: {String(v.value)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {report.flags.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm">
              {report.flags.map((flag, i) => (
                <li
                  key={i}
                  className={
                    flag.severity === "conflict"
                      ? "text-red-700"
                      : flag.severity === "warning"
                        ? "text-amber-700"
                        : "text-muted-foreground"
                  }
                >
                  • {flag.message}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Sidst opdateret {formatDate(horse.lastUpdated)}.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/40 py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : undefined}>
        {value ? String(value) : <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}

function AgreementBadge({
  agreement,
}: {
  agreement: "match" | "conflict" | "missing";
}) {
  if (agreement === "match") return <Badge tone="verified">Match</Badge>;
  if (agreement === "conflict") return <Badge tone="conflict">Konflikt</Badge>;
  return <Badge tone="unknown">Mangler</Badge>;
}
