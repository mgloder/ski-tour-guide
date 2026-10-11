"use client";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

const DIFF_COLOR: Record<string, string> = {
  novice:       "#166534",
  easy:         "#166534",
  intermediate: "#1e40af",
  advanced:     "#991b1b",
  expert:       "#18181b",
  freeride:     "#18181b",
};

async function fetchPisteGeoJSON(lat: number, lng: number) {
  const d = 0.22;
  const bbox = `${lat - d},${lng - d},${lat + d},${lng + d}`;
  const query = `[out:json][timeout:25];(way["piste:type"="downhill"](${bbox});way["aerialway"](${bbox}););out geom;`;
  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  const json = await res.json();

  type OsmElement = {
    type: string;
    geometry: { lat: number; lon: number }[];
    tags?: Record<string, string>;
  };

  return {
    type: "FeatureCollection" as const,
    features: (json.elements as OsmElement[])
      .filter(e => e.type === "way" && Array.isArray(e.geometry) && e.geometry.length > 1)
      .map(e => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: e.geometry.map(p => [p.lon, p.lat]),
        },
        properties: {
          kind: e.tags?.["piste:type"] ? "piste" : "lift",
          difficulty: e.tags?.["piste:difficulty"] ?? "unknown",
        },
      })),
  };
}

export default function ResortMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const init = () => {
      if (loadedRef.current || !containerRef.current) return;
      loadedRef.current = true;

      import("maplibre-gl").then(async (ml) => {
        if (!containerRef.current) return;

        const map = new ml.Map({
          container: containerRef.current,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [lng, lat],
          zoom: 11,
          attributionControl: false,
        });
        mapRef.current = map;
        map.addControl(new ml.AttributionControl({ compact: true }), "bottom-left");

        map.on("load", async () => {
          try {
            const geojson = await fetchPisteGeoJSON(lat, lng);
            map.addSource("ski", { type: "geojson", data: geojson });

            map.addLayer({
              id: "lifts",
              type: "line",
              source: "ski",
              filter: ["==", ["get", "kind"], "lift"],
              paint: { "line-color": "#9ca3af", "line-width": 1.5, "line-dasharray": [3, 2] },
            });

            map.addLayer({
              id: "pistes",
              type: "line",
              source: "ski",
              filter: ["==", ["get", "kind"], "piste"],
              paint: {
                "line-color": [
                  "match", ["get", "difficulty"],
                  "novice",       DIFF_COLOR.novice,
                  "easy",         DIFF_COLOR.easy,
                  "intermediate", DIFF_COLOR.intermediate,
                  "advanced",     DIFF_COLOR.advanced,
                  "expert",       DIFF_COLOR.expert,
                  "freeride",     DIFF_COLOR.freeride,
                  "#6b7280",
                ],
                "line-width": 2,
                "line-opacity": 0.85,
              },
            });

            // Zoom to fit piste bounds
            const pistes = geojson.features.filter(f => f.properties.kind === "piste");
            if (pistes.length > 0) {
              const coords = pistes.flatMap(f => f.geometry.coordinates as [number, number][]);
              const lngs = coords.map(c => c[0]);
              const lats = coords.map(c => c[1]);
              map.fitBounds(
                [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
                { padding: 32, maxZoom: 14, duration: 500 },
              );
            }
          } catch {
            // base map still shows even if piste fetch fails
          }
        });
      });
    };

    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) init(); },
      { threshold: 0.1 },
    );
    obs.observe(containerRef.current);

    return () => {
      obs.disconnect();
      (mapRef.current as { remove?: () => void })?.remove?.();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, [lat, lng]);

  return (
    <div style={{ height: 300, border: "2px solid currentColor", overflow: "hidden", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
