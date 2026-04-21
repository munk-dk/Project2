import Link from "next/link";
import { PARTIES, resolveParty, type PartyKey } from "@/lib/parties";
import type { AgreementCell } from "@/lib/analytics";

function cellColor(percent: number, sameParty: boolean): string {
  if (sameParty) return "#e5e7eb";
  // Grøn gradient: 100% = mørk grøn, 50% = lys, 0% = lys rød
  if (percent >= 75) return "#16a34a";
  if (percent >= 60) return "#4ade80";
  if (percent >= 45) return "#fde68a";
  if (percent >= 30) return "#fca5a5";
  return "#ef4444";
}

function cellText(percent: number, sameParty: boolean): string {
  if (sameParty) return "#6b7280";
  if (percent >= 75 || percent < 30) return "#ffffff";
  return "#1f2937";
}

export function AgreementMatrix({
  parties,
  cells,
}: {
  parties: string[];
  cells: AgreementCell[];
}) {
  const lookup = new Map<string, AgreementCell>();
  for (const c of cells) lookup.set(`${c.a}|${c.b}`, c);

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white p-1 text-left" />
            {parties.map((p) => {
              const info = PARTIES[p as PartyKey] ?? resolveParty(p);
              return (
                <th
                  key={`h-${p}`}
                  className="p-1 text-center font-semibold"
                  style={{ color: info.color }}
                >
                  {info.short}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {parties.map((a) => {
            const aInfo = PARTIES[a as PartyKey] ?? resolveParty(a);
            return (
              <tr key={a}>
                <th
                  className="sticky left-0 z-10 bg-white py-1 pr-2 text-right font-semibold"
                  style={{ color: aInfo.color }}
                >
                  {aInfo.short}
                </th>
                {parties.map((b) => {
                  const cell = lookup.get(`${a}|${b}`);
                  const same = a === b;
                  const percent = cell?.percent ?? 0;
                  return (
                    <td
                      key={`${a}-${b}`}
                      title={
                        same
                          ? `${aInfo.name}`
                          : `${aInfo.name} vs ${(PARTIES[b as PartyKey] ?? resolveParty(b)).name}: enighed ${percent}% (${cell?.agree ?? 0}/${cell?.compared ?? 0})`
                      }
                      className="h-10 w-10 rounded text-center font-bold md:h-12 md:w-12"
                      style={{
                        backgroundColor: cellColor(percent, same),
                        color: cellText(percent, same),
                      }}
                    >
                      {same ? "–" : `${percent}`}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Enighed:</span>
        <LegendSwatch color="#ef4444" label="0–29%" />
        <LegendSwatch color="#fca5a5" label="30–44%" />
        <LegendSwatch color="#fde68a" label="45–59%" textDark />
        <LegendSwatch color="#4ade80" label="60–74%" textDark />
        <LegendSwatch color="#16a34a" label="75–100%" />
      </div>
    </div>
  );
}

function LegendSwatch({
  color,
  label,
  textDark,
}: {
  color: string;
  label: string;
  textDark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block h-3 w-3 rounded"
        style={{ backgroundColor: color }}
      />
      <span className={textDark ? "text-foreground" : ""}>{label}</span>
    </span>
  );
}
