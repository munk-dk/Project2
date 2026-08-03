import { NextResponse } from "next/server";
import { getDataSource, getStations } from "@/lib/stations";

export const dynamic = "force-dynamic";

/**
 * Simpelt JSON-API over de berigede stationer. Læser altid fra vores egen
 * datakilde (database eller eksempeldata) — aldrig live fra eksterne API'er.
 * Nyttigt til en fremtidig frontend, evaluering, eller B2B-datalicensering.
 */
export function GET() {
  const stations = getStations();
  const { source } = getDataSource();
  return NextResponse.json({ source, count: stations.length, stations });
}
