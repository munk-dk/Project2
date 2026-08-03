/** Haversine-afstand i meter mellem to lat/lng-punkter. */
export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000; // jordens radius i meter
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/**
 * Grov gåafstand: fugleflugt ganget med en korrektionsfaktor for at tage højde
 * for at man ikke går i lige linje. 1.3 er en almindelig tommelfingerregel.
 * (En rigtig ruteberegning ville koste ekstra API-kald; overkill for PoC.)
 */
export function walkingMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  return Math.round(haversineMeters(aLat, aLng, bLat, bLng) * 1.3);
}
