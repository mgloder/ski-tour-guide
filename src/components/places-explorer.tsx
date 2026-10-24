"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import type { DbPlace } from "@/lib/places";
import { getRecommendedEquipment, getRecommendedExercises } from "@/lib/places";
import { equipment } from "@/data/equipment";
import { exercises } from "@/data/exercises";
import PlacesMap from "./places-map";
import { useIsMobile } from "@/lib/use-is-mobile";

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_OPTIONS = [
  { value: null as string | null, label: "Any level",     hint: "" },
  { value: "beginner",     label: "First timer",  hint: "green runs · learning zones", tags: ["beginner-friendly"] },
  { value: "intermediate", label: "Getting there", hint: "blues & easy reds",           tags: ["intermediate"] },
  { value: "advanced",     label: "Confident",     hint: "reds, blacks & beyond",       tags: ["advanced", "expert"] },
];

const TERRAIN_OPTIONS = [
  { value: null as string | null, label: "Any terrain",      hint: "" },
  { value: "powder",      label: "Powder & freeride", hint: "off-piste · deep snow",      tags: ["powder", "off-piste"] },
  { value: "glacier",     label: "Glacier",           hint: "high altitude · year-round", tags: ["glacier"] },
  { value: "backcountry", label: "Backcountry",       hint: "touring · remote terrain",   tags: ["backcountry"] },
  { value: "summer",      label: "Summer skiing",     hint: "open July–August",           tags: ["summer-skiing"] },
  { value: "night",       label: "Night skiing",      hint: "lit runs after dark",        tags: ["night-skiing"] },
  { value: "snowpark",    label: "Snow park",         hint: "jumps · rails · halfpipe",   tags: ["snow-park"] },
  { value: "nordic",      label: "Nordic / XC",       hint: "cross-country trails",       tags: ["nordic"] },
];

const SIZE_OPTIONS = [
  { value: null as string | null, label: "Any size", hint: "" },
  { value: "S",  label: "S < 50 km",    hint: "< 50 km"    },
  { value: "M",  label: "M 50–150 km",  hint: "50–150 km"  },
  { value: "L",  label: "L 150–300 km", hint: "150–300 km" },
  { value: "XL", label: "XL 300+ km",   hint: "300+ km"    },
];

const VERT_OPTIONS = [
  { value: null as string | null, label: "Any vert", hint: "" },
  { value: "S",  label: "< 500m",     hint: "< 500m vert"      },
  { value: "M",  label: "500–1000m",  hint: "500–1000m vert"   },
  { value: "L",  label: "1000–2000m", hint: "1000–2000m vert"  },
  { value: "XL", label: "2000m+",     hint: "2000m+ vert"      },
];

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const SORT_OPTIONS = [
  { value: "size",     label: "Largest first"    },
  { value: "alpha",    label: "A → Z"            },
  { value: "altitude", label: "Highest peak"     },
  { value: "vertical", label: "Most vertical"    },
  { value: "lifts",    label: "Most lifts"       },
  { value: "nordic",   label: "Most nordic runs" },
];

const FILTER_PRESETS = [
  { label: "Family",      level: "beginner" as string|null,     terrain: null as string|null, size: null as string|null, vert: null as string|null },
  { label: "Expert week", level: "advanced" as string|null,     terrain: null as string|null, size: "L" as string|null,  vert: "L" as string|null  },
  { label: "Powder day",  level: null as string|null,           terrain: "powder" as string|null, size: null as string|null, vert: null as string|null },
  { label: "Backcountry", level: null as string|null,           terrain: "backcountry" as string|null, size: null as string|null, vert: null as string|null },
];

const PAGE = 60;
const SK_FILTERS   = "ski-filters-v1";
const SK_FAVORITES = "ski-favorites-v1";
const SK_RECENT    = "ski-recent-v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSeasonStatus(bestMonths: string[]): "in-season" | "off-season" | null {
  if (!bestMonths?.length) return null;
  const current = MONTH_ABBR[new Date().getMonth()];
  return bestMonths.some(m => m.startsWith(current.slice(0, 3))) ? "in-season" : "off-season";
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function filterPlaces(
  places: DbPlace[],
  level: string | null,
  terrain: string | null,
  query: string,
  country: string | null,
  size: string | null,
  vert: string | null,
  month: string | null,
) {
  const levelTags   = LEVEL_OPTIONS.find(o => o.value === level)?.tags   ?? [];
  const terrainTags = TERRAIN_OPTIONS.find(o => o.value === terrain)?.tags ?? [];
  const q = query.trim().toLowerCase();
  return places.filter(p => {
    const t = new Set(p.tags);
    if (levelTags.length   && !levelTags.some(x => t.has(x)))   return false;
    if (terrainTags.length && !terrainTags.some(x => t.has(x))) return false;
    if (q) {
      const inName      = p.name.toLowerCase().includes(q);
      const inCountry   = (p.country ?? "").toLowerCase().includes(q);
      const inHighlight = (p.highlights ?? []).some(h => h.toLowerCase().includes(q));
      const inDesc      = (p.description ?? "").toLowerCase().includes(q);
      if (!inName && !inCountry && !inHighlight && !inDesc) return false;
    }
    if (country && p.country !== country) return false;
    if (size) {
      const km = p.total_km ?? 0;
      if (size === "S"  && !(km > 0  && km < 50))   return false;
      if (size === "M"  && !(km >= 50  && km < 150)) return false;
      if (size === "L"  && !(km >= 150 && km < 300)) return false;
      if (size === "XL" && !(km >= 300))             return false;
    }
    if (vert) {
      const vd = p.vertical_drop ?? 0;
      if (vert === "S"  && !(vd > 0   && vd < 500))   return false;
      if (vert === "M"  && !(vd >= 500  && vd < 1000)) return false;
      if (vert === "L"  && !(vd >= 1000 && vd < 2000)) return false;
      if (vert === "XL" && !(vd >= 2000))              return false;
    }
    if (month) {
      if (!(p.best_months ?? []).some(m => m.startsWith(month.slice(0, 3)))) return false;
    }
    return true;
  });
}

function sortPlaces(
  places: DbPlace[],
  by: string,
  userCoords?: { lat: number; lng: number } | null,
): DbPlace[] {
  if (by === "alpha")    return [...places].sort((a, b) => a.name.localeCompare(b.name));
  if (by === "altitude") return [...places].sort((a, b) => (b.altitude_peak ?? 0) - (a.altitude_peak ?? 0));
  if (by === "vertical") return [...places].sort((a, b) => (b.vertical_drop ?? 0) - (a.vertical_drop ?? 0));
  if (by === "lifts")    return [...places].sort((a, b) => (b.lifts_count ?? 0) - (a.lifts_count ?? 0));
  if (by === "nordic")   return [...places].sort((a, b) => (b.runs_nordic ?? 0) - (a.runs_nordic ?? 0));
  if (by === "distance" && userCoords) {
    return [...places].sort((a, b) => {
      if (!a.latitude || !b.latitude) return 0;
      const da = haversineKm(userCoords.lat, userCoords.lng, a.latitude, a.longitude!);
      const db = haversineKm(userCoords.lat, userCoords.lng, b.latitude, b.longitude!);
      return da - db;
    });
  }
  return [...places].sort((a, b) => (b.total_km ?? 0) - (a.total_km ?? 0));
}

function trackRecent(placeId: string) {
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(SK_RECENT) || "[]");
    const updated = [placeId, ...existing.filter(id => id !== placeId)].slice(0, 8);
    localStorage.setItem(SK_RECENT, JSON.stringify(updated));
  } catch {}
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Pill({ label, hint, active, onClick }: { label: string; hint: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "2px solid currentColor",
        background: active ? "var(--bx-primary, #2b44ff)" : "transparent",
        color: active ? "#fff" : "inherit",
        padding: "0.3rem 0.75rem",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        lineHeight: 1.4,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "0.1rem",
        whiteSpace: "nowrap",
        minHeight: 44,
        justifyContent: "center",
      }}
    >
      <span>{label}</span>
      {hint && <span style={{ opacity: 0.6, fontWeight: 400, fontSize: "0.65rem", textTransform: "none", letterSpacing: 0 }}>{hint}</span>}
    </button>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.3rem",
        border: "1.5px solid var(--bx-primary, #2b44ff)",
        background: "transparent",
        color: "var(--bx-primary, #2b44ff)",
        padding: "0.2rem 0.5rem",
        cursor: "pointer",
        fontSize: "0.65rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
        minHeight: 44,
      }}
    >
      {label} <span style={{ fontSize: "0.75rem", lineHeight: 1 }}>×</span>
    </button>
  );
}

const selectStyle: React.CSSProperties = {
  border: "2px solid currentColor",
  background: "transparent",
  color: "inherit",
  padding: "0.3rem 0.5rem",
  fontSize: "0.75rem",
  fontWeight: 700,
  fontFamily: "inherit",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  cursor: "pointer",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
  paddingRight: "1.4rem",
};

const mobileSelectStyle: React.CSSProperties = {
  border: "2px solid currentColor",
  background: "var(--bx-paper, #fff)",
  color: "inherit",
  padding: "0 0.5rem",
  height: "44px",
  fontSize: "0.7rem",
  fontWeight: 700,
  fontFamily: "inherit",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  cursor: "pointer",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
  flexShrink: 0,
  paddingRight: "1.2rem",
  minWidth: "6rem",
};

function RunStrip({ place }: { place: DbPlace }) {
  const cells = [
    { bg: "#166534", n: place.runs_green, label: "G" },
    { bg: "#1e40af", n: place.runs_blue,  label: "B" },
    { bg: "#991b1b", n: place.runs_red,   label: "R" },
    { bg: "#18181b", n: place.runs_black, label: "K" },
  ];
  const total = cells.reduce((s, c) => s + (c.n || 0), 0);
  if (total === 0) return null;
  return (
    <div style={{ marginTop: "0.5rem" }}>
      <div style={{ display: "flex", height: "20px" }}>
        {cells.map(({ bg, n, label }) => (
          <div key={label} style={{ flex: n || 0.3, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", color: "#fff", fontWeight: 700 }}>
            {n > 0 ? n : ""}
          </div>
        ))}
      </div>
      <div style={{ display: "flex" }}>
        {cells.map(({ bg, n, label }) => (
          <div key={label} style={{ flex: n || 0.3, fontSize: "0.5rem", textAlign: "center", opacity: 0.45, fontWeight: 700, paddingTop: "0.1rem", color: bg }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function TerrainDonut({ place, size = 40 }: { place: DbPlace; size?: number }) {
  const g = place.runs_green  || 0;
  const b = place.runs_blue   || 0;
  const r = place.runs_red    || 0;
  const k = place.runs_black  || 0;
  const total = g + b + r + k;
  if (total === 0) return null;
  const gp = (g / total) * 100;
  const bp = (b / total) * 100;
  const rp = (r / total) * 100;
  const gradient = `conic-gradient(#166534 0% ${gp}%, #1e40af ${gp}% ${gp + bp}%, #991b1b ${gp + bp}% ${gp + bp + rp}%, #18181b ${gp + bp + rp}% 100%)`;
  return (
    <div
      style={{ width: size, height: size, borderRadius: "50%", background: gradient, flexShrink: 0 }}
      title={`Green:${g}  Blue:${b}  Red:${r}  Black:${k}`}
    />
  );
}

function BestMonthsBar({ bestMonths }: { bestMonths: string[] }) {
  const active  = new Set((bestMonths ?? []).map(m => m.slice(0, 3)));
  const current = MONTH_ABBR[new Date().getMonth()];
  return (
    <div style={{ display: "flex", gap: "1px" }}>
      {MONTH_ABBR.map(m => {
        const on = active.has(m);
        return (
          <div
            key={m}
            title={m}
            style={{
              flex: 1, height: 12,
              background: on
                ? m === current ? "#fff" : "rgba(255,255,255,0.6)"
                : "rgba(255,255,255,0.15)",
            }}
          />
        );
      })}
    </div>
  );
}

function FeatureBadges({ place, selected }: { place: DbPlace; selected: boolean }) {
  const borderColor = selected ? "rgba(255,255,255,0.55)" : "currentColor";
  const totalRuns = (place.runs_green||0) + (place.runs_blue||0) + (place.runs_red||0) + (place.runs_black||0);
  const ratio = totalRuns > 0 && (place.lifts_count || 0) > 0
    ? (totalRuns / place.lifts_count).toFixed(1)
    : null;
  if (!place.has_night_skiing && !place.has_snow_park && !(place.runs_nordic > 0) && !ratio) return null;
  const bs: React.CSSProperties = { border: `1px solid ${borderColor}`, padding: "0.1rem 0.4rem", fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.85 };
  return (
    <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
      {place.has_night_skiing && <span style={bs}>Night</span>}
      {place.has_snow_park    && <span style={bs}>Park</span>}
      {place.runs_nordic > 0  && <span style={bs}>Nordic</span>}
      {ratio && <span style={bs}>{ratio} runs/lift</span>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlacesExplorer({ places }: { places: DbPlace[] }) {
  const isMobile = useIsMobile();
  const [mobileTab,     setMobileTab]     = useState<"map" | "list">("map");
  const [level,         setLevel]         = useState<string | null>(null);
  const [terrain,       setTerrain]       = useState<string | null>(null);
  const [country,       setCountry]       = useState<string | null>(null);
  const [size,          setSize]          = useState<string | null>(null);
  const [vert,          setVert]          = useState<string | null>(null);
  const [month,         setMonth]         = useState<string | null>(null);
  const [sortBy,        setSortBy]        = useState("size");
  const [selected,      setSelected]      = useState<DbPlace | null>(null);
  const [query,         setQuery]         = useState("");
  const [visible,       setVisible]       = useState(PAGE);
  const [clusterIds,    setClusterIds]    = useState<string[] | null>(null);
  const [mapVisibleIds, setMapVisibleIds] = useState<string[] | null>(null);
  const [favorites,     setFavorites]     = useState<Set<string>>(new Set());
  const [recentIds,     setRecentIds]     = useState<string[]>([]);
  const [userCoords,    setUserCoords]    = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading,    setGeoLoading]    = useState(false);
  const [copied,        setCopied]        = useState<"coords"|"url"|null>(null);
  const [showFavsOnly,  setShowFavsOnly]  = useState(false);
  const [filtersOpen,   setFiltersOpen]   = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const countries = useMemo(
    () => [...new Set(places.map(p => p.country).filter(Boolean))].sort() as string[],
    [places],
  );

  // ── Persist: load on mount ───────────────────────────────────────────────
  useEffect(() => {
    try {
      const f: string[] = JSON.parse(localStorage.getItem(SK_FAVORITES) || "[]");
      setFavorites(new Set(f));
    } catch {}
    try {
      const r: string[] = JSON.parse(localStorage.getItem(SK_RECENT) || "[]");
      setRecentIds(r);
    } catch {}
    // URL params take priority; fall back to saved filters
    const params = new URLSearchParams(window.location.search);
    if (params.toString()) {
      if (params.get("level"))   setLevel(params.get("level"));
      if (params.get("terrain")) setTerrain(params.get("terrain"));
      if (params.get("country")) setCountry(params.get("country"));
      if (params.get("size"))    setSize(params.get("size"));
      if (params.get("vert"))    setVert(params.get("vert"));
      if (params.get("q"))       setQuery(params.get("q")!);
      if (params.get("month"))   setMonth(params.get("month"));
      if (params.get("sort"))    setSortBy(params.get("sort")!);
    } else {
      try {
        const s = JSON.parse(localStorage.getItem(SK_FILTERS) || "{}");
        if (s.level)   setLevel(s.level);
        if (s.terrain) setTerrain(s.terrain);
        if (s.size)    setSize(s.size);
        if (s.vert)    setVert(s.vert);
        if (s.sortBy && s.sortBy !== "size") setSortBy(s.sortBy);
      } catch {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist: sync to URL + localStorage on filter change ────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (level)             params.set("level",   level);
    if (terrain)           params.set("terrain", terrain);
    if (country)           params.set("country", country);
    if (size)              params.set("size",    size);
    if (vert)              params.set("vert",    vert);
    if (query)             params.set("q",       query);
    if (month)             params.set("month",   month);
    if (sortBy !== "size") params.set("sort",    sortBy);
    const str = params.toString();
    window.history.replaceState(null, "", str ? `?${str}` : window.location.pathname);
    try {
      localStorage.setItem(SK_FILTERS, JSON.stringify({ level, terrain, size, vert, sortBy }));
    } catch {}
  }, [level, terrain, country, size, vert, query, month, sortBy]);

  // ── Data pipeline ─────────────────────────────────────────────────────────
  const filtered = useMemo(
    () => filterPlaces(places, level, terrain, query, country, size, vert, month),
    [places, level, terrain, query, country, size, vert, month],
  );
  const sorted = useMemo(
    () => sortPlaces(filtered, sortBy, userCoords),
    [filtered, sortBy, userCoords],
  );
  const highlightedIds = useMemo(() => filtered.map(p => p.id), [filtered]);

  const displayPlaces = useMemo(() => {
    let base = showFavsOnly ? sorted.filter(p => favorites.has(p.id)) : sorted;
    if (clusterIds) return places.filter(p => clusterIds.includes(p.id));
    if (!mapVisibleIds) return base;
    const viewport = new Set(mapVisibleIds);
    return base.filter(p => viewport.has(p.id) || p.id === selected?.id);
  }, [clusterIds, places, sorted, mapVisibleIds, selected?.id, showFavsOnly, favorites]);

  const visiblePlaces = useMemo(() => displayPlaces.slice(0, visible), [displayPlaces, visible]);

  const nearestFallbacks = useMemo(() => {
    if (filtered.length > 0) return [];
    return [...places].sort((a, b) => (b.total_km ?? 0) - (a.total_km ?? 0)).slice(0, 3);
  }, [filtered, places]);

  const recentPlaces = useMemo(
    () => recentIds.map(id => places.find(p => p.id === id)).filter(Boolean) as DbPlace[],
    [recentIds, places],
  );

  const activeFilterCount = [level, terrain, country, size, vert, query, month].filter(Boolean).length;

  const chips = [
    level   && { key: "level",   label: LEVEL_OPTIONS.find(o => o.value === level)?.label ?? level,       clear: () => reset({ level: null }) },
    terrain && { key: "terrain", label: TERRAIN_OPTIONS.find(o => o.value === terrain)?.label ?? terrain,  clear: () => reset({ terrain: null }) },
    country && { key: "country", label: country,                                                            clear: () => reset({ country: null }) },
    size    && { key: "size",    label: SIZE_OPTIONS.find(o => o.value === size)?.label ?? size,            clear: () => reset({ size: null }) },
    vert    && { key: "vert",    label: `Vert ${VERT_OPTIONS.find(o => o.value === vert)?.hint ?? vert}`,  clear: () => reset({ vert: null }) },
    month   && { key: "month",   label: month,                                                              clear: () => reset({ month: null }) },
    query   && { key: "query",   label: `"${query}"`,                                                       clear: () => reset({ query: "" }) },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  // ── Handlers ──────────────────────────────────────────────────────────────
  function reset(patch: Partial<{ level: string|null; terrain: string|null; country: string|null; size: string|null; vert: string|null; query: string; month: string|null }>) {
    if ("level"   in patch) setLevel(patch.level!);
    if ("terrain" in patch) setTerrain(patch.terrain!);
    if ("country" in patch) setCountry(patch.country!);
    if ("size"    in patch) setSize(patch.size!);
    if ("vert"    in patch) setVert(patch.vert!);
    if ("query"   in patch) setQuery(patch.query!);
    if ("month"   in patch) setMonth(patch.month!);
    setSelected(null); setClusterIds(null); setVisible(PAGE);
  }

  function clearAll() {
    setLevel(null); setTerrain(null); setCountry(null); setSize(null); setVert(null); setQuery(""); setMonth(null);
    setSelected(null); setClusterIds(null); setVisible(PAGE);
  }

  function handleSelect(place: DbPlace) {
    setSelected(prev => {
      const next = prev?.id === place.id ? null : place;
      if (next) { trackRecent(place.id); setRecentIds(r => [place.id, ...r.filter(id => id !== place.id)].slice(0, 8)); }
      return next;
    });
  }

  function handleMapSelect(place: DbPlace) {
    setSelected(place);
    trackRecent(place.id);
    setRecentIds(r => [place.id, ...r.filter(id => id !== place.id)].slice(0, 8));
    if (isMobile) setMobileTab("list");
  }

  function handleClusterSelect(ids: string[]) { setClusterIds(ids); setSelected(null); setVisible(PAGE); }
  function clearCluster() { setClusterIds(null); setSelected(null); setVisible(PAGE); }

  function applyPreset(p: typeof FILTER_PRESETS[0]) {
    setLevel(p.level); setTerrain(p.terrain); setSize(p.size); setVert(p.vert);
    setSelected(null); setClusterIds(null); setVisible(PAGE);
  }

  function toggleFavorite(e: React.MouseEvent, placeId: string) {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId); else next.add(placeId);
      try { localStorage.setItem(SK_FAVORITES, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function requestGeo() {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setSortBy("distance"); setGeoLoading(false); },
      () => setGeoLoading(false),
      { timeout: 10000 },
    );
  }

  async function copyCoords(e: React.MouseEvent, place: DbPlace) {
    e.stopPropagation();
    if (!place.latitude || !place.longitude) return;
    try { await navigator.clipboard.writeText(`${place.latitude}, ${place.longitude}`); setCopied("coords"); setTimeout(() => setCopied(null), 2000); } catch {}
  }

  async function sharePlace(e: React.MouseEvent, place: DbPlace) {
    e.stopPropagation();
    const url = `${window.location.origin}/places?q=${encodeURIComponent(place.name)}`;
    if (navigator.share) {
      try { await navigator.share({ title: place.name, text: `${place.name} — ${place.country}`, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); setCopied("url"); setTimeout(() => setCopied(null), 2000); } catch {}
  }

  const sortOptionsAll = useMemo(() => [
    ...SORT_OPTIONS,
    ...(userCoords ? [{ value: "distance", label: "Nearest first" }] : []),
  ], [userCoords]);

  // ── Detail panel (shared logic, called in both mobile + desktop layouts) ──
  function renderDetail(place: DbPlace) {
    const equipIds   = getRecommendedEquipment(place.tags);
    const exIds      = getRecommendedExercises(place.tags);
    const equipItems = equipment.filter(e => equipIds.includes(e.id));
    const exItems    = exercises.filter(e => exIds.includes(e.id));
    const isFav      = favorites.has(place.id);
    const mapsUrl    = place.latitude && place.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`
      : null;
    const seasonStatus = getSeasonStatus(place.best_months);

    return (
      <div onClick={e => e.stopPropagation()} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "2px solid rgba(255,255,255,0.3)", display: "flex", flexDirection: "column", gap: "0.75rem", color: "#fff" }}>
        {place.description && <p style={{ fontSize: "0.75rem", opacity: 0.85, lineHeight: 1.5, margin: 0 }}>{place.description}</p>}

        {/* Stats */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.8 }}>
          {(place.vertical_drop ?? 0) > 0 && <span>Vert: {place.vertical_drop}m</span>}
          {(place.lifts_count   ?? 0) > 0 && <span>{place.lifts_count} lifts</span>}
          {(place.runs_nordic   ?? 0) > 0 && <span>{place.runs_nordic} nordic trails</span>}
        </div>

        {/* Terrain donut + RunStrip */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
          <TerrainDonut place={place} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}><RunStrip place={place} /></div>
        </div>

        {/* Highlights */}
        {(place.highlights ?? []).length > 0 && (
          <div>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: "0.4rem" }}>Highlights</p>
            <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
              {place.highlights.map((h, i) => <li key={i} style={{ fontSize: "0.75rem", marginBottom: "0.2rem", opacity: 0.9 }}>{h}</li>)}
            </ul>
          </div>
        )}

        {/* Best months heatmap */}
        {(place.best_months ?? []).length > 0 && (
          <div>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: "0.4rem" }}>Best months</p>
            <BestMonthsBar bestMonths={place.best_months} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.15rem", fontSize: "0.45rem", opacity: 0.45 }}>
              {"JFMAMJJASOND".split("").map((c, i) => <span key={i}>{c}</span>)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
              <p style={{ fontSize: "0.75rem", opacity: 0.85, margin: 0 }}>{place.best_months.join(" · ")}</p>
              {seasonStatus && (
                <span style={{ fontSize: "0.55rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0.1rem 0.4rem", background: seasonStatus === "in-season" ? "rgba(22,101,52,0.7)" : "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.3)" }}>
                  {seasonStatus === "in-season" ? "In season" : "Off season"}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {place.website && <a href={place.website} target="_blank" rel="noopener noreferrer" style={{ border: "2px solid rgba(255,255,255,0.6)", color: "#fff", padding: "0.35rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none" }}>Website →</a>}
          {place.skimap_url && <a href={place.skimap_url} target="_blank" rel="noopener noreferrer" style={{ border: "2px solid rgba(255,255,255,0.6)", color: "#fff", padding: "0.35rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none" }}>Trail map →</a>}
          {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ border: "2px solid rgba(255,255,255,0.6)", color: "#fff", padding: "0.35rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none" }}>Maps ↗</a>}
          <button onClick={e => copyCoords(e, place)} style={{ border: "2px solid rgba(255,255,255,0.6)", color: "#fff", background: "transparent", padding: "0.35rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}>
            {copied === "coords" ? "Copied!" : "Coords"}
          </button>
          <button onClick={e => sharePlace(e, place)} style={{ border: "2px solid rgba(255,255,255,0.6)", color: "#fff", background: "transparent", padding: "0.35rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}>
            {copied === "url" ? "Link copied!" : "Share"}
          </button>
          <button onClick={e => toggleFavorite(e, place.id)} style={{ border: "2px solid rgba(255,255,255,0.6)", color: isFav ? "#fbbf24" : "#fff", background: "transparent", padding: "0.35rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}>
            {isFav ? "★ Saved" : "☆ Save"}
          </button>
        </div>

        {equipItems.length > 0 && (
          <div>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: "0.35rem" }}>Gear</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {equipItems.map(e => <Link key={e.id} href={`/equipment#${e.id}`} style={{ border: "1px solid rgba(255,255,255,0.5)", color: "#fff", padding: "0.15rem 0.5rem", fontSize: "0.65rem", textDecoration: "none" }}>{e.name}</Link>)}
            </div>
          </div>
        )}
        {exItems.length > 0 && (
          <div>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: "0.35rem" }}>Training</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {exItems.map(e => <Link key={e.id} href={`/training#${e.id}`} style={{ border: "1px solid rgba(255,255,255,0.5)", color: "#fff", padding: "0.15rem 0.5rem", fontSize: "0.65rem", textDecoration: "none" }}>{e.name}</Link>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── List item renderer (shared between mobile + desktop) ──────────────────
  function renderItem(place: DbPlace, padding: string) {
    const isSelected = selected?.id === place.id;
    const isFav = favorites.has(place.id);
    return (
      <div
        key={place.id}
        onClick={() => handleSelect(place)}
        style={{ padding, borderBottom: "2px solid currentColor", cursor: "pointer", background: isSelected ? "var(--bx-primary, #2b44ff)" : "transparent", color: isSelected ? "#fff" : "inherit", transition: "background 0.15s" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.6, marginBottom: "0.15rem" }}>{place.country} · {place.region}</p>
            <p style={{ fontWeight: 900, fontSize: "0.95rem", marginBottom: "0.2rem" }}>{place.name}</p>
          </div>
          <button
            onClick={e => toggleFavorite(e, place.id)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: isFav ? "#fbbf24" : isSelected ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)", flexShrink: 0, padding: "0.25rem", lineHeight: 1 }}
            aria-label={isFav ? "Remove from saved" : "Save"}
          >
            {isFav ? "★" : "☆"}
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em", opacity: isSelected ? 0.85 : 0.55, flexWrap: "wrap" }}>
          {(place.total_km     ?? 0) > 0 && <span>{place.total_km} km</span>}
          {(place.altitude_peak ?? 0) > 0 && <span>{place.altitude_base}–{place.altitude_peak}m</span>}
          {(place.vertical_drop ?? 0) > 0 && <span>{place.vertical_drop}m vert</span>}
          {(place.lifts_count  ?? 0) > 0 && <span>{place.lifts_count} lifts</span>}
          {place.difficulty && <span>{place.difficulty}</span>}
        </div>
        <RunStrip place={place} />
        <FeatureBadges place={place} selected={isSelected} />
        {!isSelected && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.35rem" }}>
            {place.tags.filter(t => !["night-skiing","snow-park","nordic"].includes(t)).slice(0, 3).map(tag => (
              <span key={tag} style={{ border: "1px solid currentColor", padding: "0.1rem 0.4rem", fontSize: "0.55rem", textTransform: "lowercase", opacity: 0.45 }}>{tag}</span>
            ))}
          </div>
        )}
        {isSelected && renderDetail(place)}
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  function renderEmpty() {
    return (
      <div style={{ padding: "1.5rem" }}>
        <p style={{ opacity: 0.5, fontSize: "0.85rem", marginBottom: "1rem" }}>No destinations match these filters.</p>
        {nearestFallbacks.length > 0 && (
          <>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4, marginBottom: "0.6rem" }}>Largest resorts overall</p>
            {nearestFallbacks.map(p => (
              <button
                key={p.id}
                onClick={() => { clearAll(); handleSelect(p); }}
                style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "0.4rem 0", fontSize: "0.8rem", fontWeight: 700, opacity: 0.6 }}
              >
                {p.name} <span style={{ fontWeight: 400 }}>— {p.country}</span>
              </button>
            ))}
          </>
        )}
        <button onClick={clearAll} style={{ marginTop: "1rem", border: "2px solid currentColor", background: "transparent", padding: "0.4rem 0.8rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}>
          Clear all filters
        </button>
      </div>
    );
  }

  // ── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "3px solid currentColor", flexShrink: 0 }}>
          {(["map", "list"] as const).map((tab, i) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              style={{ flex: 1, height: "48px", border: "none", borderRight: i === 0 ? "2px solid currentColor" : "none", background: mobileTab === tab ? "currentColor" : "transparent", color: mobileTab === tab ? "var(--bx-paper, #fff)" : "inherit", cursor: "pointer", fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
            >
              {tab === "map" ? "Map" : `List · ${displayPlaces.length}`}
              {tab === "map" && activeFilterCount > 0 && (
                <span style={{ background: "var(--bx-primary, #2b44ff)", color: "#fff", borderRadius: "99px", padding: "0.1rem 0.4rem", fontSize: "0.6rem", fontWeight: 900 }}>{activeFilterCount}</span>
              )}
            </button>
          ))}
        </div>

        {mobileTab === "map" && (
          <div style={{ flex: 1, position: "relative", minHeight: 0, overflow: "hidden" }}>
            <PlacesMap places={places} highlightedIds={highlightedIds} selected={selected} onSelect={handleMapSelect} onClusterSelect={handleClusterSelect} onBoundsChange={setMapVisibleIds} />
          </div>
        )}

        {mobileTab === "list" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {/* Filter strip */}
            <div style={{ flexShrink: 0, borderBottom: "3px solid currentColor", padding: "0.5rem 0.75rem", display: "flex", gap: "0.4rem", overflowX: "auto", alignItems: "center", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}>
              <input type="search" placeholder="Search…" value={query} onChange={e => reset({ query: e.target.value })} style={{ height: "44px", border: "2px solid currentColor", background: "transparent", color: "inherit", padding: "0 0.6rem", fontSize: "0.8rem", fontFamily: "inherit", outline: "none", flexShrink: 0, width: "120px" }} />

              {[
                { id: "level",   value: level,   setter: (v: string|null) => reset({ level: v }),   options: LEVEL_OPTIONS,   placeholder: "Level"   },
                { id: "terrain", value: terrain, setter: (v: string|null) => reset({ terrain: v }), options: TERRAIN_OPTIONS, placeholder: "Terrain" },
                { id: "size",    value: size,    setter: (v: string|null) => reset({ size: v }),    options: SIZE_OPTIONS,    placeholder: "Size"    },
                { id: "vert",    value: vert,    setter: (v: string|null) => reset({ vert: v }),    options: VERT_OPTIONS,    placeholder: "Vert"    },
              ].map(({ id, value, setter, options, placeholder }) => (
                <div key={id} style={{ position: "relative", flexShrink: 0 }}>
                  <select value={value ?? ""} onChange={e => setter(e.target.value || null)} style={mobileSelectStyle}>
                    <option value="">{placeholder}</option>
                    {options.filter(o => o.value).map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
                  </select>
                  {value && <span style={{ position: "absolute", top: "-4px", right: "-4px", width: "8px", height: "8px", borderRadius: "50%", background: "var(--bx-primary,#2b44ff)" }} />}
                  <span style={{ position: "absolute", right: "0.35rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "0.55rem", opacity: 0.5 }}>▼</span>
                </div>
              ))}

              {/* Month */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <select value={month ?? ""} onChange={e => reset({ month: e.target.value || null })} style={mobileSelectStyle}>
                  <option value="">Month</option>
                  {MONTH_ABBR.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {month && <span style={{ position: "absolute", top: "-4px", right: "-4px", width: "8px", height: "8px", borderRadius: "50%", background: "var(--bx-primary,#2b44ff)" }} />}
                <span style={{ position: "absolute", right: "0.35rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "0.55rem", opacity: 0.5 }}>▼</span>
              </div>

              {/* Country */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <select value={country ?? ""} onChange={e => reset({ country: e.target.value || null })} style={{ ...mobileSelectStyle, minWidth: "7rem" }}>
                  <option value="">Country</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {country && <span style={{ position: "absolute", top: "-4px", right: "-4px", width: "8px", height: "8px", borderRadius: "50%", background: "var(--bx-primary,#2b44ff)" }} />}
                <span style={{ position: "absolute", right: "0.35rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "0.55rem", opacity: 0.5 }}>▼</span>
              </div>

              {/* Sort */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={mobileSelectStyle}>
                  {sortOptionsAll.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span style={{ position: "absolute", right: "0.35rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "0.55rem", opacity: 0.5 }}>▼</span>
              </div>

              {/* Geo */}
              <button onClick={requestGeo} style={{ height: "44px", padding: "0 0.6rem", border: "2px solid currentColor", background: "transparent", cursor: "pointer", fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0, color: "inherit", whiteSpace: "nowrap" }}>
                {geoLoading ? "…" : "Near me"}
              </button>

              {/* Favs */}
              <button onClick={() => setShowFavsOnly(v => !v)} style={{ height: "44px", padding: "0 0.6rem", border: "2px solid currentColor", background: showFavsOnly ? "currentColor" : "transparent", color: showFavsOnly ? "var(--bx-paper,#fff)" : "inherit", cursor: "pointer", fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
                ★ Saved
              </button>

              {activeFilterCount > 0 && (
                <button onClick={clearAll} style={{ height: "44px", padding: "0 0.6rem", border: "2px solid currentColor", background: "transparent", cursor: "pointer", fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0, color: "inherit" }}>✕</button>
              )}
            </div>

            {/* List */}
            <div ref={listRef} style={{ flex: 1, overflowY: "auto" }}>
              {(clusterIds || selected) && (
                <button onClick={clusterIds ? clearCluster : () => setSelected(null)} style={{ border: "none", borderBottom: "2px solid currentColor", background: "transparent", padding: "0.75rem 1rem", cursor: "pointer", textAlign: "left", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5, width: "100%" }}>
                  ← {clusterIds ? `All ${filtered.length} places` : "All places"}
                </button>
              )}
              {displayPlaces.length === 0 ? renderEmpty() : visiblePlaces.map(place => renderItem(place, "0.875rem 1rem"))}
              {visible < displayPlaces.length && (
                <button onClick={() => setVisible(v => v + PAGE)} style={{ border: "none", borderTop: "2px solid currentColor", background: "transparent", padding: "1rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", width: "100%", textAlign: "center", minHeight: "52px" }}>
                  Show {Math.min(PAGE, displayPlaces.length - visible)} more
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────────────
  // Map is left (full height). All filters + list are in a scrollable right sidebar.
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── LEFT: Map — always full height ── */}
      <div style={{ flex: "0 0 65%", position: "relative", borderRight: "3px solid currentColor", height: "100%" }}>
        <PlacesMap
          places={places}
          highlightedIds={highlightedIds}
          selected={selected}
          onSelect={handleMapSelect}
          onClusterSelect={handleClusterSelect}
          onBoundsChange={setMapVisibleIds}
        />
      </div>

      {/* ── RIGHT: Scrollable sidebar ── */}
      <div ref={listRef} style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", minWidth: 0 }}>

        {/* Sticky header bar */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--bx-paper, #fff)", borderBottom: "3px solid currentColor", padding: "0.75rem 1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <div>
              <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4 }}>Module 03 · Places</p>
              <p style={{ fontWeight: 900, fontSize: "1.1rem", lineHeight: 1.1 }}>
                {clusterIds ? `${clusterIds.length} in area` : `${displayPlaces.length}`}
                <span style={{ fontWeight: 400, fontSize: "0.65rem", opacity: 0.4, marginLeft: "0.35rem" }}>
                  {clusterIds ? "" : `of ${places.length}`}
                </span>
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
              {/* Sort */}
              <div style={{ position: "relative" }}>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...selectStyle, fontSize: "0.65rem", padding: "0.25rem 1.4rem 0.25rem 0.4rem" }}>
                  {sortOptionsAll.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span style={{ position: "absolute", right: "0.35rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "0.55rem", opacity: 0.5 }}>▼</span>
              </div>
              {/* Favs toggle */}
              <button
                onClick={() => setShowFavsOnly(v => !v)}
                style={{ border: "2px solid currentColor", background: showFavsOnly ? "currentColor" : "transparent", color: showFavsOnly ? "var(--bx-paper,#fff)" : "inherit", padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}
              >
                ★{favorites.size > 0 ? ` ${favorites.size}` : ""}
              </button>
              {/* Filters toggle */}
              <button
                onClick={() => setFiltersOpen(v => !v)}
                style={{ border: "2px solid currentColor", background: filtersOpen ? "currentColor" : activeFilterCount > 0 ? "var(--bx-primary,#2b44ff)" : "transparent", color: filtersOpen || activeFilterCount > 0 ? "var(--bx-paper,#fff)" : "inherit", padding: "0.25rem 0.6rem", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}
              >
                Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""} {filtersOpen ? "▲" : "▼"}
              </button>
            </div>
          </div>

          {/* Search always visible */}
          <input
            type="search"
            placeholder={`Search ${places.length} destinations, highlights…`}
            value={query}
            onChange={e => reset({ query: e.target.value })}
            style={{ width: "100%", border: "2px solid currentColor", background: "transparent", color: "inherit", padding: "0.35rem 0.6rem", fontSize: "0.8rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />

          {/* Active chips — always visible when filters are active */}
          {chips.length > 0 && (
            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.4rem" }}>
              {chips.map(c => <FilterChip key={c.key} label={c.label} onRemove={c.clear} />)}
              <button onClick={clearAll} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.4, padding: "0.2rem 0.25rem" }}>Clear all</button>
            </div>
          )}
        </div>

        {/* ── Collapsible filter panel ── */}
        {filtersOpen && (
          <div style={{ borderBottom: "3px solid currentColor", padding: "0.75rem 1rem" }}>

            {/* Presets + utility */}
            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              {FILTER_PRESETS.map(p => {
                const active = level === p.level && terrain === p.terrain && size === p.size && vert === p.vert;
                return (
                  <button key={p.label} onClick={() => applyPreset(p)} style={{ border: "2px solid currentColor", background: active ? "currentColor" : "transparent", color: active ? "var(--bx-paper,#fff)" : "inherit", padding: "0.2rem 0.6rem", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {p.label}
                  </button>
                );
              })}
              <button onClick={requestGeo} style={{ border: "2px solid currentColor", background: sortBy === "distance" ? "currentColor" : "transparent", color: sortBy === "distance" ? "var(--bx-paper,#fff)" : "inherit", padding: "0.2rem 0.6rem", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {geoLoading ? "…" : "Near me"}
              </button>
            </div>

            {/* Level */}
            <div style={{ marginBottom: "0.5rem" }}>
              <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4, marginBottom: "0.3rem" }}>Level</p>
              <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                {LEVEL_OPTIONS.map(o => <Pill key={String(o.value)} label={o.label} hint={o.hint} active={level === o.value} onClick={() => reset({ level: o.value })} />)}
              </div>
            </div>

            {/* Terrain */}
            <div style={{ marginBottom: "0.5rem" }}>
              <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4, marginBottom: "0.3rem" }}>Terrain</p>
              <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                {TERRAIN_OPTIONS.map(o => <Pill key={String(o.value)} label={o.label} hint={o.hint} active={terrain === o.value} onClick={() => reset({ terrain: o.value })} />)}
              </div>
            </div>

            {/* Vert + Size inline */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              <div>
                <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4, marginBottom: "0.3rem" }}>Vertical drop</p>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  {VERT_OPTIONS.map(o => <Pill key={String(o.value)} label={o.label} hint={o.hint} active={vert === o.value} onClick={() => reset({ vert: o.value })} />)}
                </div>
              </div>
            </div>

            {/* Month */}
            <div style={{ marginBottom: "0.5rem" }}>
              <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4, marginBottom: "0.3rem" }}>Best in month</p>
              <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap" }}>
                {[{ value: null as string | null, label: "Any" }, ...MONTH_ABBR.map(m => ({ value: m, label: m }))].map(o => {
                  const isCurrent = o.value === MONTH_ABBR[new Date().getMonth()];
                  return (
                    <button
                      key={String(o.value)}
                      onClick={() => reset({ month: o.value })}
                      style={{ border: "2px solid currentColor", background: month === o.value ? "var(--bx-primary,#2b44ff)" : "transparent", color: month === o.value ? "#fff" : "inherit", padding: "0.15rem 0.4rem", cursor: "pointer", fontSize: "0.6rem", fontWeight: isCurrent ? 900 : 700, textTransform: "uppercase", letterSpacing: "0.04em", outline: isCurrent && month !== o.value ? "2px solid var(--bx-primary,#2b44ff)" : "none", outlineOffset: "1px" }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Country + Size + Sort row */}
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4, marginBottom: "0.3rem" }}>Country</p>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <select value={country ?? ""} onChange={e => reset({ country: e.target.value || null })} style={selectStyle}>
                    <option value="">All countries</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span style={{ position: "absolute", right: "0.4rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "0.6rem", opacity: 0.6 }}>▼</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4, marginBottom: "0.3rem" }}>Resort size</p>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  {SIZE_OPTIONS.map(o => <Pill key={String(o.value)} label={o.label} hint={o.hint} active={size === o.value} onClick={() => reset({ size: o.value })} />)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent places strip */}
        {recentPlaces.length > 0 && !selected && !clusterIds && activeFilterCount === 0 && (
          <div style={{ padding: "0.4rem 1rem", borderBottom: "2px solid currentColor", display: "flex", gap: "0.3rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.35, flexShrink: 0 }}>Recent:</span>
            {recentPlaces.slice(0, 5).map(p => (
              <button key={p.id} onClick={() => handleSelect(p)} style={{ border: "1px solid currentColor", background: "none", cursor: "pointer", fontSize: "0.6rem", padding: "0.1rem 0.4rem", opacity: 0.55 }}>
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Back button */}
        {(clusterIds || selected) && (
          <button onClick={clusterIds ? clearCluster : () => setSelected(null)} style={{ border: "none", borderBottom: "2px solid currentColor", background: "transparent", padding: "0.6rem 1rem", cursor: "pointer", textAlign: "left", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5 }}>
            ← {clusterIds ? `All ${filtered.length} places` : "All places"}
          </button>
        )}

        {/* List */}
        {displayPlaces.length === 0 ? renderEmpty() : visiblePlaces.map(place => renderItem(place, "0.875rem 1rem"))}
        {visible < displayPlaces.length && (
          <button onClick={() => setVisible(v => v + PAGE)} style={{ border: "none", borderTop: "2px solid currentColor", background: "transparent", padding: "0.75rem 1rem", cursor: "pointer", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", width: "100%", textAlign: "center" }}>
            Show {Math.min(PAGE, displayPlaces.length - visible)} more
            <span style={{ opacity: 0.4, marginLeft: "0.5rem" }}>({displayPlaces.length - visible} remaining)</span>
          </button>
        )}
      </div>
    </div>
  );
}
