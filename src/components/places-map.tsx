"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DbPlace } from "@/lib/places";

function buildGeoJSON(places: DbPlace[], highlightedIds: string[], selectedId: string | null) {
  const hl = new Set(highlightedIds);
  return {
    type: "FeatureCollection" as const,
    features: places
      .filter(p => p.latitude != null && p.longitude != null)
      .map(p => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.longitude!, p.latitude!] },
        properties: { id: p.id, name: p.name, highlighted: hl.has(p.id), selected: p.id === selectedId },
      })),
  };
}

async function fetchPistes(lat: number, lng: number, signal: AbortSignal) {
  const d = 0.22;
  const bbox = `${lat - d},${lng - d},${lat + d},${lng + d}`;
  const q = `[out:json][timeout:25];(way["piste:type"="downhill"](${bbox});way["aerialway"](${bbox}););out geom;`;
  const r = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`, { signal });
  const j = await r.json();
  type El = { type: string; geometry: { lat: number; lon: number }[]; tags?: Record<string, string> };
  return {
    type: "FeatureCollection" as const,
    features: (j.elements as El[])
      .filter(el => el.type === "way" && el.geometry?.length > 1)
      .map(el => ({
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: el.geometry.map(p => [p.lon, p.lat]) },
        properties: { kind: el.tags?.["piste:type"] ? "piste" : "lift", difficulty: el.tags?.["piste:difficulty"] ?? "unknown" },
      })),
  };
}

function safeBounds(places: DbPlace[]) {
  const pts = places.filter(p => p.latitude != null && p.longitude != null);
  if (!pts.length) return null;
  let minLng = pts[0].longitude!, maxLng = pts[0].longitude!;
  let minLat = pts[0].latitude!,  maxLat = pts[0].latitude!;
  for (const p of pts) {
    if (p.longitude! < minLng) minLng = p.longitude!;
    if (p.longitude! > maxLng) maxLng = p.longitude!;
    if (p.latitude!  < minLat) minLat = p.latitude!;
    if (p.latitude!  > maxLat) maxLat = p.latitude!;
  }
  return { minLng, maxLng, minLat, maxLat };
}

type Props = {
  places: DbPlace[];
  highlightedIds: string[];
  selected: DbPlace | null;
  onSelect: (p: DbPlace) => void;
  onClusterSelect: (ids: string[]) => void;
  onBoundsChange: (ids: string[]) => void;
};

export default function PlacesMap({ places, highlightedIds, selected, onSelect, onClusterSelect, onBoundsChange }: Props) {
  const [loading, setLoading]      = useState(true);
  const containerRef               = useRef<HTMLDivElement>(null);
  const mapRef                     = useRef<any>(null);
  const mapReadyRef                = useRef(false);
  const pisteAbortRef              = useRef<AbortController | null>(null);
  const onSelectRef                = useRef(onSelect);
  const onClusterSelectRef         = useRef(onClusterSelect);
  const onBoundsChangeRef          = useRef(onBoundsChange);
  const placesRef                  = useRef(places);
  const highlightedRef             = useRef(highlightedIds);
  const selectedRef                = useRef(selected);

  // Keep refs in sync with latest props
  useEffect(() => { onSelectRef.current        = onSelect;        }, [onSelect]);
  useEffect(() => { onClusterSelectRef.current = onClusterSelect; }, [onClusterSelect]);
  useEffect(() => { onBoundsChangeRef.current  = onBoundsChange;  }, [onBoundsChange]);
  useEffect(() => { placesRef.current          = places;          }, [places]);
  useEffect(() => { highlightedRef.current     = highlightedIds;  }, [highlightedIds]);
  useEffect(() => { selectedRef.current        = selected;        }, [selected]);

  // ── Selection: camera + piste overlay for the selected place ────────────
  function applySelection(map: any, place: DbPlace | null) {
    // Cancel any in-flight piste request and clear previous overlay
    pisteAbortRef.current?.abort();
    pisteAbortRef.current = null;
    if (map.getLayer("pistes")) map.removeLayer("pistes");
    if (map.getLayer("lifts"))  map.removeLayer("lifts");
    if (map.getSource("ski"))   map.removeSource("ski");

    if (!place) {
      const b = safeBounds(placesRef.current.filter(p => highlightedRef.current.includes(p.id)));
      if (b) map.fitBounds(
        [[b.minLng - 4, b.minLat - 2], [b.maxLng + 4, b.maxLat + 2]],
        { padding: 50, duration: 600 },
      );
      return;
    }

    if (!place.latitude || !place.longitude) return;
    map.flyTo({ center: [place.longitude, place.latitude], zoom: 10, duration: 800 });

    const abort = new AbortController();
    pisteAbortRef.current = abort;

    fetchPistes(place.latitude, place.longitude, abort.signal).then(geojson => {
      if (abort.signal.aborted || !mapRef.current || map.getSource("ski")) return;
      map.addSource("ski", { type: "geojson", data: geojson });
      map.addLayer({ id: "lifts", type: "line", source: "ski",
        filter: ["==", ["get", "kind"], "lift"],
        paint: { "line-color": "#9ca3af", "line-width": 1.5, "line-dasharray": [3, 2] } });
      map.addLayer({ id: "pistes", type: "line", source: "ski",
        filter: ["==", ["get", "kind"], "piste"],
        paint: {
          "line-color": ["match", ["get", "difficulty"],
            "novice","#166534","easy","#166534","intermediate","#1e40af",
            "advanced","#991b1b","expert","#18181b","freeride","#18181b","#6b7280"],
          "line-width": 2, "line-opacity": 0.9,
        } });
    }).catch(() => {});
  }

  // ── Init map once ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import("maplibre-gl").then(async ml => {
      if (cancelled || !containerRef.current) return;

      // Point MapLibre at the worker we copied to /public
      ml.setWorkerUrl("/maplibre-gl-worker.mjs");

      // Fetch and patch the style so fonts resolve correctly.
      // OpenFreeMap's liberty style lists "Open Sans *" which 404s; swap to Noto Sans.
      let style: any = "https://tiles.openfreemap.org/styles/liberty";
      try {
        const res = await fetch("https://tiles.openfreemap.org/styles/liberty");
        const json = await res.json();
        for (const layer of json.layers ?? []) {
          const fonts: string[] | undefined = layer.layout?.["text-font"];
          if (fonts) {
            layer.layout["text-font"] = fonts.map((f: string) =>
              f.replace(/Open Sans/g, "Noto Sans").replace(/Arial Unicode MS/g, "Noto Sans")
            );
          }
        }
        style = json;
      } catch { /* fall back to URL */ }

      if (cancelled || !containerRef.current) return;

      const map = new ml.Map({
        container: containerRef.current,
        style,
        center: [10, 46],
        zoom: 3,
        attributionControl: false,
      });
      mapRef.current = map;
      map.addControl(new ml.AttributionControl({ compact: true }), "bottom-left");

      // Use style.load (fires before all tiles) so we can interact sooner
      map.once("style.load", () => {
        if (cancelled) return;
        setLoading(false);

        // Initial bounds
        const b = safeBounds(placesRef.current);
        if (b) map.fitBounds(
          [[b.minLng - 5, b.minLat - 2], [b.maxLng + 5, b.maxLat + 2]],
          { padding: 40, duration: 0 },
        );

        // Source with clustering
        map.addSource("places", {
          type: "geojson",
          data: buildGeoJSON(placesRef.current, highlightedRef.current, selectedRef.current?.id ?? null),
          cluster: true,
          clusterMaxZoom: 8,
          clusterRadius: 55,
          clusterProperties: {
            hlCount: ["+", ["case", ["boolean", ["get", "highlighted"], false], 1, 0]],
          },
        });

        // Cluster circles
        map.addLayer({
          id: "clusters", type: "circle", source: "places",
          filter: ["has", "point_count"],
          paint: {
            "circle-radius": ["step", ["get", "point_count"], 14, 10, 20, 50, 26],
            "circle-color": ["case", [">", ["get", "hlCount"], 0], "#2b44ff", "#9ca3af"],
            "circle-opacity": ["case", [">", ["get", "hlCount"], 0], 0.85, 0.35],
            "circle-stroke-color": "#000", "circle-stroke-width": 2,
          },
        });
        map.addLayer({
          id: "cluster-count", type: "symbol", source: "places",
          filter: ["has", "point_count"],
          layout: { "text-field": "{point_count_abbreviated}", "text-size": 10 },
          paint: { "text-color": ["case", [">", ["get", "hlCount"], 0], "#fff", "#000"] },
        });

        // Individual points
        map.addLayer({
          id: "place-circles", type: "circle", source: "places",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": ["case", ["boolean", ["get", "selected"], false], 13, 8],
            "circle-color": ["case",
              ["boolean", ["get", "selected"], false], "#2b44ff",
              ["boolean", ["get", "highlighted"], false], "#2b44ff",
              "#d1d5db"],
            "circle-stroke-color": ["case", ["boolean", ["get", "selected"], false], "#fff", "#000"],
            "circle-stroke-width": ["case", ["boolean", ["get", "selected"], false], 3, 2],
            "circle-opacity": ["case",
              ["boolean", ["get", "selected"], false], 1,
              ["boolean", ["get", "highlighted"], false], 1,
              0.2],
          },
        });
        map.addLayer({
          id: "place-labels", type: "symbol", source: "places",
          filter: ["all", ["!", ["has", "point_count"]], ["boolean", ["get", "highlighted"], false]],
          layout: { "text-field": ["get", "name"], "text-offset": [0, 1.5], "text-anchor": "top", "text-size": 11, "text-optional": true },
          paint: { "text-color": "#111", "text-halo-color": "#fff", "text-halo-width": 1.5 },
        });

        // Cluster click → zoom in + filter list to cluster contents
        map.on("click", "clusters", async e => {
          const feats = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
          const feat  = feats[0];
          if (!feat) return;
          const cid   = feat.properties?.cluster_id;
          const count = feat.properties?.point_count ?? 500;
          if (cid == null) return;
          const source = map.getSource("places") as any;
          try {
            const [zoom, leaves] = await Promise.all([
              source.getClusterExpansionZoom(cid) as Promise<number>,
              source.getClusterLeaves(cid, count, 0) as Promise<any[]>,
            ]);
            map.easeTo({ center: (feat.geometry as any).coordinates, zoom: zoom + 1 });
            const ids = leaves.map((l: any) => l.properties?.id).filter(Boolean) as string[];
            if (ids.length > 0) onClusterSelectRef.current(ids);
          } catch {}
        });
        map.on("mouseenter", "clusters",      () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "clusters",      () => { map.getCanvas().style.cursor = ""; });

        // Individual point click
        map.on("click", "place-circles", e => {
          const feat  = e.features?.[0];
          if (!feat) return;
          const place = placesRef.current.find(p => p.id === feat.properties.id);
          if (place) onSelectRef.current(place);
        });
        map.on("mouseenter", "place-circles", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "place-circles", () => { map.getCanvas().style.cursor = ""; });

        // Loading spinner: only for tile/vector sources, not the piste GeoJSON overlay
        map.on("sourcedataloading", (e: any) => {
          if (e.sourceId !== "ski" && e.sourceId !== "places") setLoading(true);
        });
        map.on("idle", () => setLoading(false));

        // Report visible place IDs and load piste overlay on every camera settle
        let pisteAbort: AbortController | null = null;

        function onMoveEnd() {
          const bounds = map.getBounds();
          const ids = placesRef.current
            .filter(p => p.latitude != null && p.longitude != null &&
              bounds.contains([p.longitude!, p.latitude!]))
            .map(p => p.id);
          onBoundsChangeRef.current(ids);
        }

        map.on("moveend", onMoveEnd);

        // Mark as ready — then handle any selection that was already set
        mapReadyRef.current = true;
        if (selectedRef.current) applySelection(map, selectedRef.current);
        onMoveEnd(); // seed list on first load
      });
    });

    return () => {
      cancelled = true;
      mapReadyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update marker GeoJSON when filter or selection changes ───────────────
  useEffect(() => {
    if (!mapReadyRef.current) return;
    mapRef.current?.getSource("places")?.setData(
      buildGeoJSON(places, highlightedIds, selected?.id ?? null),
    );
  }, [places, highlightedIds, selected?.id]);

  // ── Zoom to fit highlighted markers when filter changes (no selection) ───
  useEffect(() => {
    if (!mapReadyRef.current || selectedRef.current) return;
    const map = mapRef.current;
    if (!map) return;
    const b = safeBounds(places.filter(p => highlightedIds.includes(p.id)));
    if (!b) return;
    map.fitBounds(
      [[b.minLng - 4, b.minLat - 2], [b.maxLng + 4, b.maxLat + 2]],
      { padding: 50, duration: 600 },
    );
  }, [highlightedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle selection / deselection ──────────────────────────────────────
  useEffect(() => {
    if (!mapReadyRef.current) return;
    const map = mapRef.current;
    if (!map) return;
    applySelection(map, selected);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {loading && (
        <div style={{
          position: "absolute", bottom: "1rem", left: "1rem",
          width: 28, height: 28,
          border: "3px solid rgba(0,0,0,0.12)",
          borderTopColor: "var(--bx-primary, #2b44ff)",
          borderRadius: "50%",
          animation: "map-spin 0.75s linear infinite",
          pointerEvents: "none",
        }} />
      )}
      <style>{`@keyframes map-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
