import { getDataSource, getStations } from "@/lib/stations";
import { StationsView } from "@/components/StationsView";
import { SampleBanner } from "@/components/SampleBanner";

// Data læses server-side ved request; ingen live eksterne kald (jf. brief).
export const dynamic = "force-dynamic";

export default function HomePage() {
  const stations = getStations();
  const { isSample } = getDataSource();

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Hvor holder du bedst pause?</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ikke antal ledige ladere — men hvad stedet er godt til under din 30-40 minutters
          ladepause: toiletter, mad, indkøb, ro og plads til at strække ben.
        </p>
      </div>

      {isSample && <SampleBanner />}

      <StationsView stations={stations} />
    </div>
  );
}
