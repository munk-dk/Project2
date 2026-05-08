import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { HorseSearchResult } from "@/lib/types";

const SEX_LABEL: Record<string, string> = {
  stallion: "Hingst",
  mare: "Hoppe",
  gelding: "Vallak",
};

export function HorseResultCard({ horse }: { horse: HorseSearchResult }) {
  const sources = Array.from(new Set(horse.hits.map((h) => h.source)));
  return (
    <Link href={`/horse/${encodeURIComponent(horse.id)}`} className="block">
      <Card className="transition hover:border-brand-400 hover:shadow-md">
        <CardBody>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                {horse.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {[
                  horse.birthYear,
                  horse.sex ? SEX_LABEL[horse.sex] : null,
                  horse.studbook,
                  horse.country,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {sources.map((s) => (
                <Badge key={s} tone="info">
                  {s.toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
            {horse.ueln && <Detail label="UELN" value={horse.ueln} />}
            {horse.feiId && <Detail label="FEI" value={horse.feiId} />}
            {horse.danishIdent && (
              <Detail label="DK ident" value={horse.danishIdent} />
            )}
            {horse.chipNumber && <Detail label="Chip" value={horse.chipNumber} />}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide">{label}</div>
      <div className="font-mono text-foreground">{value}</div>
    </div>
  );
}
