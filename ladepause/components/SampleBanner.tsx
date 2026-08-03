export function SampleBanner() {
  return (
    <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <strong>Eksempeldata.</strong> Databasen er ikke bygget endnu, så du ser illustrative
      pladsholder-resuméer. Kør berigelses-pipelinen{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">npm run pipeline:all</code> med
      API-nøgler for at generere rigtige resuméer fra Google Places + Claude.
    </div>
  );
}
