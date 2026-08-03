"use client";

import { useEffect, useRef, useState } from "react";

export interface MapStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface StationMapProps {
  stations: MapStation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Undgå at indlæse Google Maps-scriptet flere gange.
let mapsLoader: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).google?.maps) return Promise.resolve();
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Kunne ikke indlæse Google Maps"));
    document.head.appendChild(script);
  });
  return mapsLoader;
}

export function StationMap({ stations, selectedId, onSelect }: StationMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [status, setStatus] = useState<"idle" | "ready" | "error">("idle");

  // Initialisér kortet.
  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const google = (window as any).google;
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: 55.2, lng: 10.2 },
          zoom: 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        const bounds = new google.maps.LatLngBounds();
        for (const s of stations) {
          const marker = new google.maps.Marker({
            position: { lat: s.lat, lng: s.lng },
            map,
            title: s.name,
          });
          marker.addListener("click", () => onSelect(s.id));
          markersRef.current[s.id] = marker;
          bounds.extend({ lat: s.lat, lng: s.lng });
        }
        if (stations.length) map.fitBounds(bounds, 48);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
    };
    // Vi genskaber ikke kortet ved ændringer i stations (fast sæt i PoC'en).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Fremhæv valgt station.
  useEffect(() => {
    const google = (window as any).google;
    if (!google?.maps || status !== "ready") return;
    for (const [id, marker] of Object.entries(markersRef.current)) {
      const active = id === selectedId;
      marker.setAnimation(active ? google.maps.Animation.BOUNCE : null);
      if (active && mapRef.current) mapRef.current.panTo(marker.getPosition());
    }
  }, [selectedId, status]);

  if (!apiKey) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        Kortet kræver en <code className="mx-1 rounded bg-slate-100 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.
        Listevisningen nedenfor virker uden nøgle.
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed border-red-300 bg-white p-6 text-center text-sm text-red-500">
        Kunne ikke indlæse kortet. Tjek din Google Maps-nøgle.
      </div>
    );
  }

  return <div ref={containerRef} className="h-full min-h-[240px] w-full rounded-lg" />;
}
