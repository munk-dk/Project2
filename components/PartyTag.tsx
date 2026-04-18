import { resolveParty } from "@/lib/parties";
import { cn } from "@/lib/utils";

export function PartyTag({
  party,
  className,
  full = false,
}: {
  party?: string | null;
  className?: string;
  full?: boolean;
}) {
  const info = resolveParty(party);
  return (
    <span
      title={info.name}
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold",
        className,
      )}
      style={{ backgroundColor: info.color, color: info.textColor }}
    >
      {full ? info.name : info.short}
    </span>
  );
}
