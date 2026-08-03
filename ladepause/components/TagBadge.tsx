import { TAGS, type TagKey } from "@/lib/types";

export function TagBadge({ tag }: { tag: TagKey }) {
  const meta = TAGS[tag];
  if (!meta) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-teal-800">
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

export function TagList({ tags }: { tags: TagKey[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <TagBadge key={t} tag={t} />
      ))}
    </div>
  );
}
