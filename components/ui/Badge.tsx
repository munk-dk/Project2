import { cn } from "@/lib/utils";

type Tone = "for" | "against" | "abstain" | "absent" | "neutral";

const toneClasses: Record<Tone, string> = {
  for: "bg-green-100 text-green-800 border-green-200",
  against: "bg-red-100 text-red-800 border-red-200",
  abstain: "bg-amber-100 text-amber-800 border-amber-200",
  absent: "bg-gray-100 text-gray-700 border-gray-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
