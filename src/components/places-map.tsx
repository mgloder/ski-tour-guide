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
        properties: {
          id: p.id,
          name: p.name,
          highlighted: hl.has(p.id),
          selected: p.id === selectedId,
          km: p.total_km ?? 0,
        },
      })),
  };
}

async function fetchPistes(placeId: string, signal: AbortSignal) {
  const res = await fetch(`/api/pistes?id=${encodeURIComponent(placeId)}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ type: "FeatureCollection"; features: { type: "Feature"; geometry: { type: "LineString"; coordinates: [number, number][] }; properties: { kind: string; difficulty: string; liftCategory?: string } }[] }>;
}

function _haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Remove piste/lift features that belong to neighbouring resorts.
 * Strategy: find the median centroid of all piste features (robust against outliers),
 * then keep only features within an adaptive radius scaled by resort size.
 */
function filterPistesByProximity(geojson: { type: "FeatureCollection"; features: any[] }, place: DbPlace): { type: "FeatureCollection"; features: any[] } {
  const features = geojson.features;
  const pistes = features.filter(f => f.properties?.kind === "piste");
  if (pistes.length === 0) return geojson;

  // Centroid of each piste feature
  const centroids = pistes.map(f => {
    const coords: [number, number][] = f.geometry.coordinates;
    const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    return { lat, lng };
  });

  // Median lat + lng (independent sort — robust against outliers)
  const sortedByLat = [...centroids].sort((a, b) => a.lat - b.lat);
  const sortedByLng = [...centroids].sort((a, b) => a.lng - b.lng);
  const mid = Math.floor(centroids.length / 2);
  const medLat = sortedByLat[mid].lat;
  const medLng = sortedByLng[mid].lng;

  // Adaptive radius: sqrt(km * 0.8), clamped to [6, 22] km
  const km = place.total_km ?? 50;
  const maxDistKm = Math.max(6, Math.min(22, Math.sqrt(km * 0.8)));

  return {
    ...geojson,
    features: features.filter(f => {
      const coords: [number, number][] = f.geometry.coordinates;
      const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      return _haversineKm(medLat, medLng, lat, lng) <= maxDistKm;
    }),
  };
}

/** Annotate each lift feature with a liftCategory based on coordinate count (proxy for length). */
function annotateLiftCategories(geojson: { type: "FeatureCollection"; features: any[] }) {
  return {
    ...geojson,
    features: geojson.features.map((f: any) => {
      if (f.properties?.kind !== "lift") return f;
      const coordCount: number = f.geometry?.coordinates?.length ?? 0;
      return {
        ...f,
        properties: {
          ...f.properties,
          liftCategory: coordCount < 4 ? "short" : "long",
        },
      };
    }),
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

const MAP_STYLES = {
  street:    "https://tiles.openfreemap.org/styles/liberty",
  satellite: "https://tiles.openfreemap.org/styles/satellite",
  dark:      "https://tiles.openfreemap.org/styles/dark",
};

type MapStyleKey = keyof typeof MAP_STYLES;

type PisteDifficulty = "all" | "green" | "blue" | "red" | "black";

const DIFFICULTY_BUTTONS: { key: PisteDifficulty; label: string; color: string }[] = [
  { key: "all",   label: "All",   color: "#6b7280" },
  { key: "green", label: "Green", color: "#166534" },
  { key: "blue",  label: "Blue",  color: "#1e40af" },
  { key: "red",   label: "Red",   color: "#991b1b" },
  { key: "black", label: "Black", color: "#18181b" },
];

export default function PlacesMap({ places, highlightedIds, selected, onSelect, onClusterSelect, onBoundsChange }: Props) {
  const [loading, setLoading]                       = useState(true);
  const [pisteLoading, setPisteLoading]             = useState(false);
  const [pisteError, setPisteError]                 = useState(false);
  const [pisteLoaded, setPisteLoaded]               = useState(false);
  const [layerVis, setLayerVis]                     = useState({ pistes: true, lifts: true });
  const [hoverInfo, setHoverInfo]                   = useState<{ name: string; stat: string; x: number; y: number } | null>(null);
  const [lineHover, setLineHover]                   = useState<{ name: string; kind: string; x: number; y: number } | null>(null);
  const [mapStyle, setMapStyle]                     = useState<MapStyleKey>("street");
  const [fullscreen, setFullscreen]                 = useState(false);
  const [difficultyFilter, setDifficultyFilter]     = useState<PisteDifficulty>("all");
  const [attributionVisible, setAttributionVisible] = useState(true);
  const [showLabels, setShowLabels]                 = useState(true);  // Feature 2: base map labels
  const [resortLabels, setResortLabels]             = useState<"highlighted"|"big"|"all">("highlighted"); // Feature 2b: resort name density
  const [bearing, setBearing]                       = useState(0);     // Feature 5: bearing reset
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
  const layerVisRef                = useRef({ pistes: true, lifts: true });
  const attributionControlRef      = useRef<any>(null);
  const mlRef                      = useRef<any>(null);
  const pisteAnimatedRef           = useRef(false);  // Feature 4: animate only on first load

  // Keep refs in sync with latest props
  useEffect(() => { onSelectRef.current        = onSelect;        }, [onSelect]);
  useEffect(() => { onClusterSelectRef.current = onClusterSelect; }, [onClusterSelect]);
  useEffect(() => { onBoundsChangeRef.current  = onBoundsChange;  }, [onBoundsChange]);
  useEffect(() => { placesRef.current          = places;          }, [places]);
  useEffect(() => { highlightedRef.current     = highlightedIds;  }, [highlightedIds]);
  useEffect(() => { selectedRef.current        = selected;        }, [selected]);

  // ── Feature 2: Label density ─────────────────────────────────────────────
  function applyLabelVisibility(map: any, visible: boolean) {
    const style = map.getStyle();
    if (!style) return;
    for (const layer of style.layers ?? []) {
      if (layer.type === "symbol") {
        map.setLayoutProperty(layer.id, "visibility", visible ? "visible" : "none");
      }
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    applyLabelVisibility(map, showLabels);
  }, [showLabels]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyResortLabelFilter(map: any, mode: "highlighted" | "big" | "all") {
    if (!map.getLayer("place-labels")) return;
    if (mode === "highlighted") {
      map.setFilter("place-labels", ["all", ["!", ["has", "point_count"]], ["boolean", ["get", "highlighted"], false]]);
      map.setLayoutProperty("place-labels", "visibility", "visible");
    } else if (mode === "big") {
      map.setFilter("place-labels", ["all", ["!", ["has", "point_count"]], ["any", [">=", ["get", "km"], 100], ["boolean", ["get", "highlighted"], false]]]);
      map.setLayoutProperty("place-labels", "visibility", "visible");
    } else {
      map.setFilter("place-labels", ["all", ["!", ["has", "point_count"]]]);
      map.setLayoutProperty("place-labels", "visibility", "visible");
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    applyResortLabelFilter(map, resortLabels);
  }, [resortLabels]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Feature 3: Keyboard navigation ───────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Focus map container on mount so keyboard events are captured immediately
    el.focus({ preventScroll: true });
    function handleKeyDown(e: KeyboardEvent) {
      const map = mapRef.current;
      if (!map || !mapReadyRef.current) return;
      const ids = highlightedRef.current;
      if (!ids.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const currentId = selectedRef.current?.id ?? "";
        const idx = ids.indexOf(currentId);
        const nextIdx = e.key === "ArrowDown"
          ? (idx + 1) % ids.length
          : (idx - 1 + ids.length) % ids.length;
        const nextId = ids[nextIdx];
        const place = placesRef.current.find(p => p.id === nextId);
        if (place) onSelectRef.current(place);
      }
    }
    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Difficulty filter ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current || !map.getLayer("pistes")) return;

    if (difficultyFilter === "all") {
      map.setFilter("pistes", ["==", ["get", "kind"], "piste"]);
      map.setPaintProperty("pistes", "line-opacity", 0.9);
    } else {
      const diffMap: Record<PisteDifficulty, string[]> = {
        all:   [],
        green: ["novice", "easy"],
        blue:  ["intermediate"],
        red:   ["advanced"],
        black: ["expert", "freeride"],
      };
      const vals = diffMap[difficultyFilter];
      map.setFilter("pistes", ["in", ["get", "difficulty"], ["literal", vals]]);
      // Highlight beginner (#23) or expert (#24): non-matching lines at 10% opacity via filter already hides them.
      // We restore full opacity for the selected difficulty group.
      map.setPaintProperty("pistes", "line-opacity", 0.9);
    }
  }, [difficultyFilter]);

  // ── Piste hover glow layer (#29) ───────────────────────────────────────────
  const hoveredPisteIdRef = useRef<number | string | null>(null);

  function addPisteHoverListeners(map: any) {
    map.on("mouseenter", "pistes", (e: any) => {
      map.getCanvas().style.cursor = "crosshair";
      const feat = e.features?.[0];
      if (!feat) return;
      const featId = feat.id ?? feat.properties?.id;
      hoveredPisteIdRef.current = featId;

      const difficulty: string = feat.properties?.difficulty ?? "";
      const colorMap: Record<string, string> = {
        novice: "#166534", easy: "#166534",
        intermediate: "#1e40af",
        advanced: "#991b1b",
        expert: "#18181b", freeride: "#18181b",
      };
      const glowColor = colorMap[difficulty] ?? "#6b7280";

      // Remove any existing hover layer
      if (map.getLayer("pistes-hover")) map.removeLayer("pistes-hover");

      map.addLayer({
        id: "pistes-hover",
        type: "line",
        source: "ski",
        filter: ["==", ["id"], featId],
        paint: {
          "line-width": 6,
          "line-color": glowColor,
          "line-opacity": 0.5,
          "line-blur": 2,
        },
      });

      // Also update line hover tooltip
      const name = feat.properties?.name || feat.properties?.ref || "";
      const kind = feat.properties?.kind || "piste";
      if (name) setLineHover({ name, kind, x: e.originalEvent.clientX, y: e.originalEvent.clientY });
    });

    map.on("mousemove", "pistes", (e: any) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const featId = feat.id ?? feat.properties?.id;

      if (featId !== hoveredPisteIdRef.current) {
        hoveredPisteIdRef.current = featId;
        const difficulty: string = feat.properties?.difficulty ?? "";
        const colorMap: Record<string, string> = {
          novice: "#166534", easy: "#166534",
          intermediate: "#1e40af",
          advanced: "#991b1b",
          expert: "#18181b", freeride: "#18181b",
        };
        const glowColor = colorMap[difficulty] ?? "#6b7280";
        if (map.getLayer("pistes-hover")) map.removeLayer("pistes-hover");
        map.addLayer({
          id: "pistes-hover",
          type: "line",
          source: "ski",
          filter: ["==", ["id"], featId],
          paint: { "line-width": 6, "line-color": glowColor, "line-opacity": 0.5, "line-blur": 2 },
        });
      }
      setLineHover(prev => prev ? { ...prev, x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null);
    });

    map.on("mouseleave", "pistes", () => {
      map.getCanvas().style.cursor = "";
      hoveredPisteIdRef.current = null;
      if (map.getLayer("pistes-hover")) map.removeLayer("pistes-hover");
      setLineHover(null);
    });
  }

  // Feature 1: lift hover tooltips on both sub-layers
  function addLiftHoverListeners(map: any) {
    for (const liftLayer of ["lifts-short", "lifts-long"] as const) {
      map.on("mouseenter", liftLayer, (e: any) => {
        map.getCanvas().style.cursor = "crosshair";
        const feat = e.features?.[0];
        if (!feat) return;
        const name = feat.properties?.name || feat.properties?.ref || "";
        const kind = feat.properties?.kind || "lift";
        if (name) setLineHover({ name, kind, x: e.originalEvent.clientX, y: e.originalEvent.clientY });
      });
      map.on("mousemove", liftLayer, (e: any) => {
        setLineHover(prev => prev ? { ...prev, x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null);
      });
      map.on("mouseleave", liftLayer, () => {
        map.getCanvas().style.cursor = "";
        setLineHover(null);
      });
    }
  }

  // ── Selection: camera + piste overlay for the selected place ────────────
  function applySelection(map: any, place: DbPlace | null) {
    // Cancel any in-flight piste request and clear previous overlay
    pisteAbortRef.current?.abort();
    pisteAbortRef.current = null;
    setPisteError(false);
    if (map.getLayer("pistes-hover"))  map.removeLayer("pistes-hover");
    if (map.getLayer("pistes"))        map.removeLayer("pistes");
    if (map.getLayer("lifts-long"))    map.removeLayer("lifts-long");
    if (map.getLayer("lifts-short"))   map.removeLayer("lifts-short");
    if (map.getSource("ski"))          map.removeSource("ski");
    setDifficultyFilter("all");

    if (!place) {
      setPisteLoading(false);
      setPisteLoaded(false);
      const b = safeBounds(placesRef.current.filter(p => highlightedRef.current.includes(p.id)));
      if (b) map.fitBounds(
        [[b.minLng - 4, b.minLat - 2], [b.maxLng + 4, b.maxLat + 2]],
        { padding: 50, duration: 600 },
      );
      return;
    }

    if (!place.latitude || !place.longitude) return;
    map.flyTo({ center: [place.longitude, place.latitude], zoom: 10, duration: 800 });

    // Check sessionStorage cache before fetching (#120)
    try {
      const cached = sessionStorage.getItem("ski-piste-" + place.id);
      if (cached) {
        const rawGeojson = JSON.parse(cached);
        const geojson = annotateLiftCategories(filterPistesByProximity(rawGeojson, place));
        setPisteLoading(false);
        if (!mapRef.current || map.getSource("ski")) return;
        map.addSource("ski", { type: "geojson", data: geojson });
        // Feature 1: two lift sub-layers by category
        map.addLayer({ id: "lifts-short", type: "line", source: "ski",
          filter: ["all", ["==", ["get", "kind"], "lift"], ["==", ["get", "liftCategory"], "short"]],
          layout: { visibility: layerVisRef.current.lifts ? "visible" : "none" },
          paint: { "line-color": "#9ca3af", "line-width": 1.5, "line-dasharray": [2, 2] } });
        map.addLayer({ id: "lifts-long", type: "line", source: "ski",
          filter: ["all", ["==", ["get", "kind"], "lift"], ["==", ["get", "liftCategory"], "long"]],
          layout: { visibility: layerVisRef.current.lifts ? "visible" : "none" },
          paint: { "line-color": "#6b7280", "line-width": 2, "line-dasharray": [5, 2] } });
        map.addLayer({ id: "pistes", type: "line", source: "ski",
          filter: ["==", ["get", "kind"], "piste"],
          layout: { visibility: layerVisRef.current.pistes ? "visible" : "none" },
          paint: {
            "line-color": ["match", ["get", "difficulty"],
              "novice","#166534","easy","#166534","intermediate","#1e40af",
              "advanced","#991b1b","expert","#18181b","freeride","#18181b","#6b7280"],
            "line-width": 2, "line-opacity": 0.9,
          } });
        setPisteLoaded(true);
        addPisteHoverListeners(map);
        addLiftHoverListeners(map);
        const coords = geojson.features
          .filter((f: any) => f.properties.kind === "piste")
          .flatMap((f: any) => f.geometry.coordinates as [number, number][]);
        if (coords.length) {
          let mnLng = coords[0][0], mxLng = coords[0][0];
          let mnLat = coords[0][1], mxLat = coords[0][1];
          for (const [lng, lat] of coords) {
            if (lng < mnLng) mnLng = lng;
            if (lng > mxLng) mxLng = lng;
            if (lat < mnLat) mnLat = lat;
            if (lat > mxLat) mxLat = lat;
          }
          const cam = map.cameraForBounds([[mnLng, mnLat], [mxLng, mxLat]], { padding: 40, maxZoom: 14 });
          if (cam && (cam.zoom as number) >= 9) {
            map.easeTo({ ...cam, duration: 600 });
          }
        }
        return;
      }
    } catch { /* sessionStorage unavailable or parse error — fall through to fetch */ }

    const abort = new AbortController();
    pisteAbortRef.current = abort;
    const timeoutId = setTimeout(() => abort.abort(), 40_000);
    setPisteLoading(true);

    fetchPistes(place.id, abort.signal).then(geojson => {
      clearTimeout(timeoutId);
      if (abort.signal.aborted) return;
      setPisteLoading(false);
      if (!mapRef.current || map.getSource("ski")) return;
      // Filter neighbouring-resort features, then annotate lift categories
      const annotated = annotateLiftCategories(filterPistesByProximity(geojson, place));
      // Store cleaned data in sessionStorage cache (#120)
      try { sessionStorage.setItem("ski-piste-" + place.id, JSON.stringify(annotated)); } catch { /* quota exceeded or private mode */ }
      map.addSource("ski", { type: "geojson", data: annotated });
      // Feature 1: two lift sub-layers by category
      map.addLayer({ id: "lifts-short", type: "line", source: "ski",
        filter: ["all", ["==", ["get", "kind"], "lift"], ["==", ["get", "liftCategory"], "short"]],
        layout: { visibility: layerVisRef.current.lifts ? "visible" : "none" },
        paint: { "line-color": "#9ca3af", "line-width": 1.5, "line-dasharray": [2, 2] } });
      map.addLayer({ id: "lifts-long", type: "line", source: "ski",
        filter: ["all", ["==", ["get", "kind"], "lift"], ["==", ["get", "liftCategory"], "long"]],
        layout: { visibility: layerVisRef.current.lifts ? "visible" : "none" },
        paint: { "line-color": "#6b7280", "line-width": 2, "line-dasharray": [5, 2] } });
      map.addLayer({ id: "pistes", type: "line", source: "ski",
        filter: ["==", ["get", "kind"], "piste"],
        layout: { visibility: layerVisRef.current.pistes ? "visible" : "none" },
        paint: {
          "line-color": ["match", ["get", "difficulty"],
            "novice","#166534","easy","#166534","intermediate","#1e40af",
            "advanced","#991b1b","expert","#18181b","freeride","#18181b","#6b7280"],
          "line-width": 2, "line-opacity": 0.9,
        } });
      setPisteLoaded(true);

      // Feature 4: animated piste draw-in on first load
      if (!pisteAnimatedRef.current) {
        pisteAnimatedRef.current = true;
        let step = 0;
        const steps = 24;
        const animate = () => {
          step++;
          const drawn = (step / steps) * 200;
          const gap = 200 - drawn;
          if (map.getLayer("pistes")) {
            map.setPaintProperty("pistes", "line-dasharray", [drawn, gap]);
          }
          if (step < steps) requestAnimationFrame(animate);
          else if (map.getLayer("pistes")) map.setPaintProperty("pistes", "line-dasharray", undefined as any);
        };
        requestAnimationFrame(animate);
      }

      // Piste hover glow (#29)
      addPisteHoverListeners(map);

      // Lift hover tooltips
      addLiftHoverListeners(map);

      // Fit camera to the full extent of the loaded pistes, but never zoom out
      const coords = geojson.features
        .filter(f => f.properties.kind === "piste")
        .flatMap(f => f.geometry.coordinates as [number, number][]);
      if (coords.length) {
        let mnLng = coords[0][0], mxLng = coords[0][0];
        let mnLat = coords[0][1], mxLat = coords[0][1];
        for (const [lng, lat] of coords) {
          if (lng < mnLng) mnLng = lng;
          if (lng > mxLng) mxLng = lng;
          if (lat < mnLat) mnLat = lat;
          if (lat > mxLat) mxLat = lat;
        }
        // Only apply fitBounds if it wouldn't zoom out past 9 (avoids bleeding
        // into neighbouring-resort pistes from the wide Overpass bbox query)
        const cam = map.cameraForBounds([[mnLng, mnLat], [mxLng, mxLat]], { padding: 40, maxZoom: 14 });
        if (cam && (cam.zoom as number) >= 9) {
          map.easeTo({ ...cam, duration: 600 });
        }
      }
    }).catch(() => {
      clearTimeout(timeoutId);
      if (abort.signal.aborted) return;
      setPisteLoading(false);
      setPisteError(true);
    });
  }

  // Helper: add terrain for 3D (#25/#26)
  function tryAddTerrain(map: any) {
    try {
      if (!map.getSource("terrain")) {
        map.addSource("terrain", {
          type: "raster-dem",
          url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
          tileSize: 256,
          encoding: "terrarium",
        });
      }
      map.setTerrain({ source: "terrain", exaggeration: 1.5 });
    } catch { /* terrain not supported in this style */ }
  }

  // Helper: add all place layers (reused on style reload)
  function addPlaceLayers(map: any, currentStyle: MapStyleKey) {
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

    // Individual points — circle-radius scales by km (#112)
    map.addLayer({
      id: "place-circles", type: "circle", source: "places",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": ["case",
          ["boolean", ["get", "selected"], false], 13,
          ["interpolate", ["linear"], ["coalesce", ["get", "km"], 0],
            0, 6, 50, 8, 150, 10, 300, 13],
        ],
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
      paint: {
        "text-color": currentStyle === "dark" ? "#fff" : "#111",
        "text-halo-color": currentStyle === "dark" ? "#000" : "#fff",
        "text-halo-width": 1.5,
      },
    });
  }

  // ── Init map once ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import("maplibre-gl").then(async ml => {
      if (cancelled || !containerRef.current) return;

      mlRef.current = ml;

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
      const attrControl = new ml.AttributionControl({ compact: true });
      attributionControlRef.current = attrControl;
      map.addControl(attrControl, "bottom-left");
      map.addControl(new ml.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-right");

      // Feature 5: ensure touch rotate is enabled
      if (map.touchZoomRotate) map.touchZoomRotate.enableRotation();

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

        addPlaceLayers(map, "street");

        // Feature 5: track bearing for reset button
        map.on("rotate", () => setBearing(map.getBearing()));

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
        map.on("mouseenter", "place-circles", (e: any) => {
          map.getCanvas().style.cursor = "pointer";
          const feat = e.features?.[0];
          if (!feat) return;
          const place = placesRef.current.find(p => p.id === feat.properties.id);
          if (!place) return;
          const km = place.total_km ?? 0;
          const vd = (place as any).vertical_drop ?? 0;
          const stat = vd > 0 ? `${vd}m vert` : km > 0 ? `${km} km` : "";
          setHoverInfo({ name: place.name, stat, x: e.originalEvent.clientX, y: e.originalEvent.clientY });
        });
        map.on("mousemove", "place-circles", (e: any) => {
          setHoverInfo(prev => prev ? { ...prev, x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null);
        });
        map.on("mouseleave", "place-circles", () => {
          map.getCanvas().style.cursor = "";
          setHoverInfo(null);
        });

        // Loading spinner: only for tile/vector sources, not the piste GeoJSON overlay
        map.on("sourcedataloading", (e: any) => {
          if (e.sourceId !== "ski" && e.sourceId !== "places") setLoading(true);
        });
        map.on("idle", () => setLoading(false));

        // Report visible place IDs and load piste overlay on every camera settle
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

  // ── Map style change ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    const styleUrl = MAP_STYLES[mapStyle];
    map.setStyle(styleUrl);
    // Re-add sources/layers after style reload
    map.once("style.load", () => {
      if (!map.getSource("places")) {
        addPlaceLayers(map, mapStyle);
      }
      // Satellite + 3D terrain (#25/#26)
      if (mapStyle === "satellite") {
        tryAddTerrain(map);
      }
      // Feature 2: re-apply label visibility after style reload
      applyLabelVisibility(map, showLabels);
      applyResortLabelFilter(map, resortLabels);
      // Re-add piste overlay if selected; also reset difficulty filter
      setDifficultyFilter("all");
      if (selectedRef.current) applySelection(map, selectedRef.current);
    });
  }, [mapStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Attribution toggle (#68) ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const ml  = mlRef.current;
    if (!map || !ml || !mapReadyRef.current) return;
    if (attributionVisible) {
      if (!attributionControlRef.current) {
        const ctrl = new ml.AttributionControl({ compact: true });
        attributionControlRef.current = ctrl;
        map.addControl(ctrl, "bottom-left");
      }
    } else {
      if (attributionControlRef.current) {
        try { map.removeControl(attributionControlRef.current); } catch {}
        attributionControlRef.current = null;
      }
    }
  }, [attributionVisible]);

  function toggleLayer(layer: "pistes" | "lifts") {
    const next = { ...layerVisRef.current, [layer]: !layerVisRef.current[layer] };
    layerVisRef.current = next;
    setLayerVis(next);
    const map = mapRef.current;
    if (!map) return;
    const vis = next[layer] ? "visible" : "none";
    if (layer === "lifts") {
      if (map.getLayer("lifts-short")) map.setLayoutProperty("lifts-short", "visibility", vis);
      if (map.getLayer("lifts-long"))  map.setLayoutProperty("lifts-long",  "visibility", vis);
    } else {
      if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", vis);
    }
  }

  function applyDifficultyFilter(diff: PisteDifficulty) {
    setDifficultyFilter(diff);
    const map = mapRef.current;
    if (!map || !mapReadyRef.current || !map.getLayer("pistes")) return;

    if (diff === "all") {
      map.setFilter("pistes", ["==", ["get", "kind"], "piste"]);
      map.setPaintProperty("pistes", "line-opacity", 0.9);
    } else {
      const diffMap: Record<PisteDifficulty, string[]> = {
        all:   [],
        green: ["novice", "easy"],
        blue:  ["intermediate"],
        red:   ["advanced"],
        black: ["expert", "freeride"],
      };
      const vals = diffMap[diff];
      // Show only the selected difficulty (#19)
      map.setFilter("pistes", ["in", ["get", "difficulty"], ["literal", vals]]);
      map.setPaintProperty("pistes", "line-opacity", 0.9);
    }
  }

  const btnBase: React.CSSProperties = {
    border: "2px solid #000",
    padding: "0.3rem 0.5rem",
    fontSize: "0.55rem",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    cursor: "pointer",
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...(fullscreen ? { position: "fixed", inset: 0, zIndex: 9999 } : {}) }}>
      {/* Feature 3: tabIndex + autoFocus for keyboard navigation */}
      <div
        ref={containerRef}
        tabIndex={0}
        style={{ width: "100%", height: "100%", outline: "none" }}
      />
      {/* Map tile loading spinner */}
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
      {/* Piste fetch: full-width top bar */}
      {pisteLoading && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          background: "var(--bx-primary, #2b44ff)",
          color: "#fff",
          padding: "0.6rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          pointerEvents: "none",
          zIndex: 10,
        }}>
          <span style={{
            display: "inline-block",
            width: 16, height: 16,
            border: "2.5px solid rgba(255,255,255,0.35)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "map-spin 0.75s linear infinite",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "0.75rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Loading ski trails…
          </span>
        </div>
      )}
      {pisteError && !pisteLoading && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          background: "#991b1b",
          color: "#fff",
          padding: "0.6rem 1rem",
          fontSize: "0.75rem",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          pointerEvents: "none",
          zIndex: 10,
        }}>
          Trail data unavailable — try again later
        </div>
      )}
      {/* Layer toggles — only visible when piste data is loaded */}
      {pisteLoaded && (
        <div style={{
          position: "absolute", bottom: "2.5rem", left: "0.75rem",
          display: "flex", gap: "0.25rem", zIndex: 5,
        }}>
          {(["pistes", "lifts"] as const).map(layer => (
            <button
              key={layer}
              onClick={() => toggleLayer(layer)}
              style={{
                background: layerVis[layer] ? "var(--bx-primary, #2b44ff)" : "rgba(255,255,255,0.92)",
                color: layerVis[layer] ? "#fff" : "#111",
                border: "2px solid #000",
                padding: "0.3rem 0.65rem",
                fontSize: "0.6rem",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              {layer === "pistes" ? "Pistes" : "Lifts"}
            </button>
          ))}
        </div>
      )}
      {/* Difficulty filter buttons (#19, #23, #24) — below style toggles in top-left */}
      {pisteLoaded && (
        <div style={{
          position: "absolute", top: "2.6rem", left: "0.75rem",
          display: "flex", gap: "0.25rem", zIndex: 5,
        }}>
          {DIFFICULTY_BUTTONS.map(({ key, label, color }) => {
            const active = difficultyFilter === key;
            return (
              <button
                key={key}
                onClick={() => applyDifficultyFilter(key)}
                style={{
                  ...btnBase,
                  background: active ? color : "rgba(255,255,255,0.92)",
                  color: active ? "#fff" : "#111",
                  borderColor: active ? color : "#000",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
      {/* Difficulty legend — shown when piste data is loaded */}
      {pisteLoaded && layerVis.pistes && (
        <div style={{
          position: "absolute", bottom: "2.5rem", right: "0.75rem",
          background: "rgba(255,255,255,0.93)",
          border: "2px solid #000",
          padding: "0.45rem 0.6rem",
          fontSize: "0.58rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          lineHeight: 1.9,
          zIndex: 5,
          pointerEvents: "none",
        }}>
          {[
            { color: "#166534", label: "Green" },
            { color: "#1e40af", label: "Blue"  },
            { color: "#991b1b", label: "Red"   },
            { color: "#18181b", label: "Black" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ display: "inline-block", width: 18, height: 3, background: color, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
      )}
      {/* Map style + fullscreen + attribution + print toggles (#25, #68, #72) */}
      <div style={{ position: "absolute", top: "0.75rem", left: "0.75rem", display: "flex", gap: "0.25rem", zIndex: 5 }}>
        {(["street", "satellite", "dark"] as const).map(s => (
          <button
            key={s}
            onClick={() => setMapStyle(s)}
            style={{
              ...btnBase,
              background: mapStyle === s ? "#000" : "rgba(255,255,255,0.92)",
              color: mapStyle === s ? "#fff" : "#111",
            }}
          >
            {s === "street" ? "Map" : s === "satellite" ? "Sat" : "Dark"}
          </button>
        ))}
        <button
          onClick={() => setAttributionVisible(v => !v)}
          title={attributionVisible ? "Hide attribution" : "Show attribution"}
          style={{
            ...btnBase,
            background: attributionVisible ? "rgba(255,255,255,0.92)" : "#000",
            color: attributionVisible ? "#111" : "#fff",
          }}
        >
          ©
        </button>
        {/* Feature 2: Base map labels toggle */}
        <button
          onClick={() => setShowLabels(v => !v)}
          title={showLabels ? "Hide map labels" : "Show map labels"}
          style={{
            ...btnBase,
            background: showLabels ? "rgba(255,255,255,0.92)" : "#000",
            color: showLabels ? "#111" : "#fff",
          }}
        >
          Labels
        </button>
        {/* Feature 2b: Resort name density */}
        <button
          onClick={() => setResortLabels(m => m === "highlighted" ? "big" : m === "big" ? "all" : "highlighted")}
          title={resortLabels === "highlighted" ? "Resort labels: active only — click for large resorts" : resortLabels === "big" ? "Resort labels: large (>100km) — click for all" : "Resort labels: all — click to reset"}
          style={{
            ...btnBase,
            background: resortLabels === "all" ? "var(--bx-primary,#2b44ff)" : resortLabels === "big" ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.6)",
            color: resortLabels === "all" ? "#fff" : "#111",
            fontSize: "0.6rem",
          }}
        >
          {resortLabels === "highlighted" ? "Aa·" : resortLabels === "big" ? "Aa" : "AA"}
        </button>
        {/* Feature 5: Bearing reset — only visible when rotated > 5° */}
        {Math.abs(bearing) > 5 && (
          <button
            onClick={() => mapRef.current?.resetNorth({ duration: 300 })}
            title="Reset bearing to north"
            style={{ ...btnBase, background: "rgba(255,255,255,0.92)", color: "#111" }}
          >
            ⊕
          </button>
        )}
        <button
          onClick={() => window.print()}
          style={{ ...btnBase, background: "rgba(255,255,255,0.92)", color: "#111" }}
        >
          Print
        </button>
        <button
          onClick={() => setFullscreen(v => !v)}
          style={{ ...btnBase, background: "rgba(255,255,255,0.92)", color: "#111" }}
        >
          {fullscreen ? "Exit" : "⛶"}
        </button>
      </div>

      {/* Zoom to filtered results button */}
      {!selected && (
        <button
          onClick={() => {
            const map = mapRef.current;
            if (!map) return;
            const b = safeBounds(placesRef.current.filter(p => highlightedRef.current.includes(p.id)));
            if (b) map.fitBounds([[b.minLng - 2, b.minLat - 1], [b.maxLng + 2, b.maxLat + 1]], { padding: 40, duration: 600 });
          }}
          style={{
            position: "absolute", top: "0.75rem", right: "0.75rem",
            background: "rgba(255,255,255,0.92)",
            border: "2px solid #000",
            padding: "0.3rem 0.65rem",
            fontSize: "0.6rem", fontWeight: 900,
            textTransform: "uppercase", letterSpacing: "0.06em",
            cursor: "pointer", zIndex: 5,
          }}
        >
          Zoom to results
        </button>
      )}
      {/* Piste/lift line hover tooltip */}
      {lineHover && (
        <div style={{ position: "fixed", left: lineHover.x + 12, top: lineHover.y - 36, background: lineHover.kind === "lift" ? "#1f2937" : "#000", color: "#fff", padding: "0.25rem 0.55rem", fontSize: "0.65rem", fontWeight: 700, pointerEvents: "none", zIndex: 20, whiteSpace: "nowrap" }}>
          {lineHover.name} <span style={{ opacity: 0.6, fontWeight: 400 }}>{lineHover.kind}</span>
        </div>
      )}
      {/* Marker hover tooltip */}
      {hoverInfo && (
        <div style={{
          position: "fixed",
          left: hoverInfo.x + 12,
          top: hoverInfo.y - 36,
          background: "#000",
          color: "#fff",
          padding: "0.25rem 0.55rem",
          fontSize: "0.65rem",
          fontWeight: 700,
          pointerEvents: "none",
          zIndex: 20,
          whiteSpace: "nowrap",
        }}>
          {hoverInfo.name}{hoverInfo.stat ? ` · ${hoverInfo.stat}` : ""}
        </div>
      )}
      <style>{`@keyframes map-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
