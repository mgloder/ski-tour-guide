"use client";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { DbPlace } from "@/lib/places";
import { getRecommendedEquipment, getRecommendedExercises } from "@/lib/places";
import { equipment } from "@/data/equipment";
import { exercises } from "@/data/exercises";
import PlacesMap from "./places-map";
import QuizModal from "./quiz-modal";
import { useIsMobile } from "@/lib/use-is-mobile";

// ── Constants ─────────────────────────────────────────────────────────────────

// Feature B: Country groups
const COUNTRY_GROUPS: Record<string, string[]> = {
  "Alps":          ["Austria", "Switzerland", "France", "Italy", "Germany", "Liechtenstein", "Slovenia"],
  "Scandinavia":   ["Norway", "Sweden", "Finland"],
  "North America": ["United States", "Canada"],
  "Japan":         ["Japan"],
  "Other":         [],
};

const ALL_GROUPED_COUNTRIES = Object.values(COUNTRY_GROUPS).flat();

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
const SK_TRIP      = "ski-trip-v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

// Feature E: Haptic feedback
function haptic(pattern: number | number[] = 10) {
  try { if ("vibrate" in navigator) navigator.vibrate(pattern); } catch {}
}

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
  terrain: string[],
  query: string,
  country: string | null,
  size: string | null,
  vert: string | null,
  month: string | null,
  regionFilter: string | null,
) {
  const levelTags = LEVEL_OPTIONS.find(o => o.value === level)?.tags ?? [];
  // Feature A: collect tags for all selected terrains; place must satisfy ALL selected terrains
  const terrainTagSets = terrain.map(t => TERRAIN_OPTIONS.find(o => o.value === t)?.tags ?? []);
  const q = query.trim().toLowerCase();
  return places.filter(p => {
    const t = new Set(p.tags);
    if (levelTags.length && !levelTags.some(x => t.has(x))) return false;
    if (terrainTagSets.length > 0 && !terrainTagSets.every(tags => tags.some(x => new Set(p.tags).has(x)))) return false;
    if (q) {
      const inName      = p.name.toLowerCase().includes(q);
      const inCountry   = (p.country ?? "").toLowerCase().includes(q);
      const inHighlight = (p.highlights ?? []).some(h => h.toLowerCase().includes(q));
      const inDesc      = (p.description ?? "").toLowerCase().includes(q);
      if (!inName && !inCountry && !inHighlight && !inDesc) return false;
    }
    if (country && p.country !== country) return false;
    // Feature B: region filter
    if (regionFilter) {
      const groupCountries = COUNTRY_GROUPS[regionFilter];
      if (regionFilter === "Other") {
        if (ALL_GROUPED_COUNTRIES.includes(p.country)) return false;
      } else if (groupCountries && groupCountries.length > 0 && !groupCountries.includes(p.country)) {
        return false;
      }
    }
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
      {(place.vertical_drop ?? 0) > 0 && (
        <div style={{ fontSize: "0.5rem", textAlign: "center", opacity: 0.4, paddingTop: "0.15rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          ↕ {place.vertical_drop}m vert
        </div>
      )}
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

// ── Compare overlay (defined outside main component) ─────────────────────────

type CompareOverlayProps = {
  compareIds: Set<string>;
  places: DbPlace[];
  onClose: () => void;
};

function CompareOverlay({ compareIds, places, onClose }: CompareOverlayProps) {
  const comparePlaces = [...compareIds].map(id => places.find(p => p.id === id)).filter(Boolean) as DbPlace[];
  const labelStyle: React.CSSProperties = { fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.5, padding: "0.4rem 0.75rem", background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" };
  const cellStyle: React.CSSProperties = { padding: "0.4rem 0.75rem", fontSize: "0.8rem", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.1)" };

  const rows: { label: string; value: (p: DbPlace) => string }[] = [
    { label: "Country",      value: p => p.country ?? "—" },
    { label: "Total km",     value: p => p.total_km ? `${p.total_km} km` : "—" },
    { label: "Vertical",     value: p => p.vertical_drop ? `${p.vertical_drop}m` : "—" },
    { label: "Lifts",        value: p => p.lifts_count ? String(p.lifts_count) : "—" },
    { label: "Altitude",     value: p => (p.altitude_base || p.altitude_peak) ? `${p.altitude_base}–${p.altitude_peak}m` : "—" },
    { label: "Green runs",   value: p => p.runs_green  ? String(p.runs_green)  : "—" },
    { label: "Blue runs",    value: p => p.runs_blue   ? String(p.runs_blue)   : "—" },
    { label: "Red runs",     value: p => p.runs_red    ? String(p.runs_red)    : "—" },
    { label: "Black runs",   value: p => p.runs_black  ? String(p.runs_black)  : "—" },
    { label: "Tags",         value: p => (p.tags ?? []).slice(0, 4).join(", ") || "—" },
  ];

  const colCount = comparePlaces.length + 1;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", overflowY: "auto" }} onClick={onClose}>
      <div style={{ maxWidth: "900px", margin: "2rem auto", padding: "0 1rem 4rem" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <p style={{ color: "#fff", fontWeight: 900, fontSize: "1.1rem" }}>Compare resorts</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "1.5rem", lineHeight: 1, opacity: 0.6 }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${colCount}, 1fr)`, border: "2px solid rgba(255,255,255,0.3)" }}>
          {/* Header row */}
          <div style={labelStyle} />
          {comparePlaces.map(p => (
            <div key={p.id} style={{ ...labelStyle, color: "#fff", opacity: 1, fontWeight: 900, fontSize: "0.75rem" }}>{p.name}</div>
          ))}
          {/* Data rows */}
          {rows.map(row => (
            <>
              <div key={`lbl-${row.label}`} style={labelStyle}>{row.label}</div>
              {comparePlaces.map(p => (
                <div key={`${p.id}-${row.label}`} style={{ ...cellStyle, color: "#fff" }}>{row.value(p)}</div>
              ))}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Trip overlay (defined outside main component) ─────────────────────────────

type TripOverlayProps = {
  tripIds: Set<string>;
  places: DbPlace[];
  onClose: () => void;
  onRemove: (id: string) => void;
};

function TripOverlay({ tripIds, places, onClose, onRemove }: TripOverlayProps) {
  const tripPlaces = [...tripIds].map(id => places.find(p => p.id === id)).filter(Boolean) as DbPlace[];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", overflowY: "auto" }} onClick={onClose}>
      <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "0 1rem 4rem" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <p style={{ color: "#fff", fontWeight: 900, fontSize: "1.1rem" }}>My trip ({tripPlaces.length})</p>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "1.5rem", lineHeight: 1, opacity: 0.6 }}>×</button>
        </div>
        {tripPlaces.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>No resorts added yet. Open a resort and tap "Add to trip".</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {tripPlaces.map(p => (
              <div key={p.id} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ color: "#fff", fontWeight: 900, fontSize: "0.9rem", marginBottom: "0.2rem" }}>{p.name}</p>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {p.country}{p.total_km ? ` · ${p.total_km} km` : ""}{p.vertical_drop ? ` · ${p.vertical_drop}m vert` : ""}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(p.id)}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", padding: "0.25rem 0.5rem", flexShrink: 0, marginLeft: "0.75rem" }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton loading (Feature J) — defined outside main component ─────────────

function SkeletonCard() {
  return (
    <div style={{ padding: "0.875rem 1rem", borderBottom: "2px solid currentColor", opacity: 0.5 }}>
      <div style={{ height: "0.6rem", background: "currentColor", width: "30%", marginBottom: "0.5rem", opacity: 0.2 }} />
      <div style={{ height: "0.95rem", background: "currentColor", width: "70%", marginBottom: "0.35rem", opacity: 0.3 }} />
      <div style={{ height: "0.6rem", background: "currentColor", width: "50%", opacity: 0.15 }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PlacesExplorer({ places }: { places: DbPlace[] }) {
  const isMobile = useIsMobile();
  const [mobileTab,        setMobileTab]        = useState<"map" | "list">("map");
  const [level,            setLevel]            = useState<string | null>(null);
  // Feature A: terrain is now string[]
  const [terrain,          setTerrain]          = useState<string[]>([]);
  const [country,          setCountry]          = useState<string | null>(null);
  const [size,             setSize]             = useState<string | null>(null);
  const [vert,             setVert]             = useState<string | null>(null);
  const [month,            setMonth]            = useState<string | null>(null);
  const [sortBy,           setSortBy]           = useState("size");
  const [selected,         setSelected]         = useState<DbPlace | null>(null);
  const [query,            setQuery]            = useState("");
  const [visible,          setVisible]          = useState(PAGE);
  const [clusterIds,       setClusterIds]       = useState<string[] | null>(null);
  const [mapVisibleIds,    setMapVisibleIds]     = useState<string[] | null>(null);
  const [favorites,        setFavorites]        = useState<Set<string>>(new Set());
  const [recentIds,        setRecentIds]        = useState<string[]>([]);
  const [userCoords,       setUserCoords]       = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading,       setGeoLoading]       = useState(false);
  const [copied,           setCopied]           = useState<"coords"|"url"|null>(null);
  const [showFavsOnly,     setShowFavsOnly]     = useState(false);
  const [filtersOpen,      setFiltersOpen]      = useState(false);
  // Feature B: region filter
  const [regionFilter,     setRegionFilter]     = useState<string | null>(null);
  // Feature C: mobile filter modal
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  // Feature F: reduce motion
  const [reduceMotion,     setReduceMotion]     = useState(false);
  // Feature J: skeleton loading
  const [mounted,          setMounted]          = useState(false);

  // Feature states
  const [showQuiz,      setShowQuiz]      = useState(false);
  const [compareIds,    setCompareIds]    = useState<Set<string>>(new Set());
  const [showCompare,   setShowCompare]   = useState(false);
  const [tripIds,       setTripIds]       = useState<Set<string>>(new Set());
  const [showTrip,      setShowTrip]      = useState(false);
  const [compactCards,  setCompactCards]  = useState(false);
  const [placeWeather,  setPlaceWeather]  = useState<Record<string, { temp: number; wind: number; snow: number; desc: string } | "loading" | "error">>({});
  const [showCorrectionForm, setShowCorrectionForm] = useState<string | null>(null);
  const [correctionText,     setCorrectionText]     = useState("");

  // Feature D: swipe refs
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const countries = useMemo(
    () => [...new Set(places.map(p => p.country).filter(Boolean))].sort() as string[],
    [places],
  );

  // ── Persist: load on mount ───────────────────────────────────────────────
  useEffect(() => {
    // Feature J: mark mounted
    setMounted(true);

    // Feature F: reduce motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const mqHandler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", mqHandler);

    try {
      const f: string[] = JSON.parse(localStorage.getItem(SK_FAVORITES) || "[]");
      setFavorites(new Set(f));
    } catch {}
    try {
      const r: string[] = JSON.parse(localStorage.getItem(SK_RECENT) || "[]");
      setRecentIds(r);
    } catch {}
    try {
      const t: string[] = JSON.parse(localStorage.getItem(SK_TRIP) || "[]");
      setTripIds(new Set(t));
    } catch {}
    // URL params take priority; fall back to saved filters
    const params = new URLSearchParams(window.location.search);
    if (params.toString()) {
      if (params.get("level"))   setLevel(params.get("level"));
      if (params.get("terrain")) setTerrain(params.get("terrain")!.split(",").filter(Boolean));
      if (params.get("country")) setCountry(params.get("country"));
      if (params.get("size"))    setSize(params.get("size"));
      if (params.get("vert"))    setVert(params.get("vert"));
      if (params.get("q"))       setQuery(params.get("q")!);
      if (params.get("month"))   setMonth(params.get("month"));
      if (params.get("sort"))    setSortBy(params.get("sort")!);
      if (params.get("region"))  setRegionFilter(params.get("region"));
    } else {
      try {
        const s = JSON.parse(localStorage.getItem(SK_FILTERS) || "{}");
        if (s.level)   setLevel(s.level);
        if (s.terrain) setTerrain(Array.isArray(s.terrain) ? s.terrain : []);
        if (s.size)    setSize(s.size);
        if (s.vert)    setVert(s.vert);
        if (s.sortBy && s.sortBy !== "size") setSortBy(s.sortBy);
        if (s.regionFilter) setRegionFilter(s.regionFilter);
      } catch {}
    }

    return () => {
      mq.removeEventListener("change", mqHandler);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist: sync to URL + localStorage on filter change ────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (level)              params.set("level",   level);
    if (terrain.length > 0) params.set("terrain", terrain.join(","));
    if (country)            params.set("country", country);
    if (size)               params.set("size",    size);
    if (vert)               params.set("vert",    vert);
    if (query)              params.set("q",       query);
    if (month)              params.set("month",   month);
    if (sortBy !== "size")  params.set("sort",    sortBy);
    if (regionFilter)       params.set("region",  regionFilter);
    const str = params.toString();
    window.history.replaceState(null, "", str ? `?${str}` : window.location.pathname);
    try {
      localStorage.setItem(SK_FILTERS, JSON.stringify({ level, terrain, size, vert, sortBy, regionFilter }));
    } catch {}
  }, [level, terrain, country, size, vert, query, month, sortBy, regionFilter]);

  // ── Data pipeline ─────────────────────────────────────────────────────────
  const filtered = useMemo(
    () => filterPlaces(places, level, terrain, query, country, size, vert, month, regionFilter),
    [places, level, terrain, query, country, size, vert, month, regionFilter],
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

  const activeFilterCount = [level, country, size, vert, query, month].filter(Boolean).length + terrain.length;

  const chips: { key: string; label: string; clear: () => void }[] = [
    ...(level   ? [{ key: "level",   label: LEVEL_OPTIONS.find(o => o.value === level)?.label ?? level,       clear: () => reset({ level: null }) }] : []),
    ...terrain.map(t => ({ key: `terrain-${t}`, label: TERRAIN_OPTIONS.find(o => o.value === t)?.label ?? t, clear: () => setTerrain(prev => prev.filter(x => x !== t)) })),
    ...(country ? [{ key: "country", label: country,                                                            clear: () => reset({ country: null }) }] : []),
    ...(size    ? [{ key: "size",    label: SIZE_OPTIONS.find(o => o.value === size)?.label ?? size,            clear: () => reset({ size: null }) }] : []),
    ...(vert    ? [{ key: "vert",    label: `Vert ${VERT_OPTIONS.find(o => o.value === vert)?.hint ?? vert}`,  clear: () => reset({ vert: null }) }] : []),
    ...(month   ? [{ key: "month",   label: month,                                                              clear: () => reset({ month: null }) }] : []),
    ...(query   ? [{ key: "query",   label: `"${query}"`,                                                       clear: () => reset({ query: "" }) }] : []),
  ];

  // ── Infinite scroll sentinel ──────────────────────────────────────────────
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) {
        setVisible(v => Math.min(v + PAGE, displayPlaces.length));
      }
    }, { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [displayPlaces.length, visible]);

  // ── Weather fetch ─────────────────────────────────────────────────────────
  const fetchWeather = useCallback(async (place: DbPlace) => {
    if (!place.latitude || !place.longitude) return;
    if (placeWeather[place.id]) return;
    setPlaceWeather(prev => ({ ...prev, [place.id]: "loading" }));
    try {
      const res = await fetch(`/api/weather?lat=${place.latitude}&lng=${place.longitude}`);
      if (!res.ok) throw new Error("bad response");
      const data = await res.json() as { temperature_2m: number; wind_speed_10m: number; snowfall: number; description: string };
      setPlaceWeather(prev => ({
        ...prev,
        [place.id]: { temp: data.temperature_2m, wind: data.wind_speed_10m, snow: data.snowfall, desc: data.description },
      }));
    } catch {
      setPlaceWeather(prev => ({ ...prev, [place.id]: "error" }));
    }
  }, [placeWeather]);

  useEffect(() => {
    if (selected) fetchWeather(selected);
  }, [selected, fetchWeather]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function reset(patch: Partial<{ level: string|null; country: string|null; size: string|null; vert: string|null; query: string; month: string|null }>) {
    if ("level"   in patch) setLevel(patch.level!);
    if ("country" in patch) setCountry(patch.country!);
    if ("size"    in patch) setSize(patch.size!);
    if ("vert"    in patch) setVert(patch.vert!);
    if ("query"   in patch) setQuery(patch.query!);
    if ("month"   in patch) setMonth(patch.month!);
    setSelected(null); setClusterIds(null); setVisible(PAGE);
  }

  function toggleTerrain(value: string | null) {
    if (value === null) { setTerrain([]); }
    else { setTerrain(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]); }
    setSelected(null); setClusterIds(null); setVisible(PAGE);
  }

  function clearAll() {
    setLevel(null); setTerrain([]); setCountry(null); setSize(null); setVert(null); setQuery(""); setMonth(null); setRegionFilter(null);
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
    setLevel(p.level); setTerrain(p.terrain ? [p.terrain] : []); setSize(p.size); setVert(p.vert);
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

  function toggleCompare(e: React.MouseEvent, placeId: string) {
    e.stopPropagation();
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else if (next.size < 3) {
        next.add(placeId);
      }
      return next;
    });
  }

  function toggleTrip(e: React.MouseEvent, placeId: string) {
    e.stopPropagation();
    setTripIds(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId); else next.add(placeId);
      try { localStorage.setItem(SK_TRIP, JSON.stringify([...next])); } catch {}
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
    const isOnTrip   = tripIds.has(place.id);
    const mapsUrl    = place.latitude && place.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`
      : null;
    const seasonStatus = getSeasonStatus(place.best_months);
    const weather = placeWeather[place.id];

    return (
      <div onClick={e => e.stopPropagation()} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "2px solid rgba(255,255,255,0.3)", display: "flex", flexDirection: "column", gap: "0.75rem", color: "#fff" }}>
        {place.description && <p style={{ fontSize: "0.75rem", opacity: 0.85, lineHeight: 1.5, margin: 0 }}>{place.description}</p>}

        {/* Weather widget */}
        {weather && weather !== "error" && (
          <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.85, flexWrap: "wrap" }}>
            {weather === "loading" ? (
              <span>…</span>
            ) : (
              <>
                <span>{weather.temp}°C</span>
                <span>·</span>
                <span>Wind {weather.wind} km/h</span>
                <span>·</span>
                <span>{weather.desc}</span>
                {weather.snow > 0 && <><span>·</span><span>Snow: {weather.snow} cm</span></>}
              </>
            )}
          </div>
        )}

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
          {place.latitude && place.longitude && (
            <a href={`https://www.panomax.com/search#${encodeURIComponent(place.name)}`} target="_blank" rel="noopener noreferrer" style={{ border: "2px solid rgba(255,255,255,0.6)", color: "#fff", padding: "0.35rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none" }}>Webcams ↗</a>
          )}
          <button onClick={e => copyCoords(e, place)} style={{ border: "2px solid rgba(255,255,255,0.6)", color: "#fff", background: "transparent", padding: "0.35rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}>
            {copied === "coords" ? "Copied!" : "Coords"}
          </button>
          <button onClick={e => sharePlace(e, place)} style={{ border: "2px solid rgba(255,255,255,0.6)", color: "#fff", background: "transparent", padding: "0.35rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}>
            {copied === "url" ? "Link copied!" : "Share"}
          </button>
          <button onClick={e => toggleFavorite(e, place.id)} style={{ border: "2px solid rgba(255,255,255,0.6)", color: isFav ? "#fbbf24" : "#fff", background: "transparent", padding: "0.35rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}>
            {isFav ? "★ Saved" : "☆ Save"}
          </button>
          <button onClick={e => toggleTrip(e, place.id)} style={{ border: "2px solid rgba(255,255,255,0.6)", color: isOnTrip ? "#4ade80" : "#fff", background: "transparent", padding: "0.35rem 0.6rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}>
            {isOnTrip ? "✓ On trip" : "Add to trip"}
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

        {showCorrectionForm === place.id ? (
          <div style={{ marginTop: "0.75rem" }}>
            <textarea
              value={correctionText}
              onChange={e => setCorrectionText(e.target.value)}
              placeholder="Describe the issue (wrong coordinates, name, etc.)"
              style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.5)", color: "#fff", padding: "0.4rem", fontSize: "0.7rem", fontFamily: "inherit", resize: "vertical", minHeight: "60px", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.3rem" }}>
              <button
                onClick={async () => {
                  if (!correctionText.trim()) return;
                  await fetch("/api/corrections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placeId: place.id, message: correctionText }) });
                  setCorrectionText("");
                  setShowCorrectionForm(null);
                }}
                style={{ border: "1px solid rgba(255,255,255,0.5)", background: "transparent", color: "#fff", padding: "0.3rem 0.6rem", fontSize: "0.6rem", fontWeight: 700, cursor: "pointer" }}
              >
                Submit
              </button>
              <button onClick={() => setShowCorrectionForm(null)} style={{ border: "none", background: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.6rem" }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCorrectionForm(place.id)} style={{ marginTop: "0.5rem", background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: 0 }}>
            Report error
          </button>
        )}
      </div>
    );
  }

  // ── List item renderer (shared between mobile + desktop) ──────────────────
  function renderItem(place: DbPlace, padding: string) {
    const isSelected = selected?.id === place.id;
    const isFav = favorites.has(place.id);
    const isInCompare = compareIds.has(place.id);

    if (compactCards && !isSelected) {
      return (
        <div
          key={place.id}
          onClick={() => handleSelect(place)}
          style={{ padding: "0.4rem 1rem", borderBottom: "2px solid currentColor", cursor: "pointer", background: isSelected ? "var(--bx-primary, #2b44ff)" : "transparent", color: isSelected ? "#fff" : "inherit", transition: "background 0.15s" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 900, fontSize: "0.85rem", margin: 0 }}>{place.name}</p>
              <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.55, marginTop: "0.1rem", flexWrap: "wrap" }}>
                <span>{place.country}</span>
                {(place.total_km ?? 0) > 0 && <span>{place.total_km} km</span>}
                {(place.vertical_drop ?? 0) > 0 && <span>{place.vertical_drop}m vert</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.2rem", flexShrink: 0, alignItems: "center" }}>
              <button
                onClick={e => toggleCompare(e, place.id)}
                style={{ width: 28, height: 28, border: "1.5px solid currentColor", background: isInCompare ? "var(--bx-primary,#2b44ff)" : "transparent", color: isInCompare ? "#fff" : "inherit", cursor: "pointer", fontSize: "0.85rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                aria-label={isInCompare ? "Remove from compare" : "Add to compare"}
              >
                +
              </button>
              <button
                onClick={e => toggleFavorite(e, place.id)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: isFav ? "#fbbf24" : isSelected ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)", flexShrink: 0, padding: "0.25rem", lineHeight: 1 }}
                aria-label={isFav ? "Remove from saved" : "Save"}
              >
                {isFav ? "★" : "☆"}
              </button>
            </div>
          </div>
        </div>
      );
    }

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
          <div style={{ display: "flex", gap: "0.2rem", flexShrink: 0, alignItems: "center" }}>
            <button
              onClick={e => toggleCompare(e, place.id)}
              style={{ width: 28, height: 28, border: "1.5px solid currentColor", background: isInCompare ? "var(--bx-primary,#2b44ff)" : "transparent", color: isInCompare ? "#fff" : "inherit", cursor: "pointer", fontSize: "0.85rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              aria-label={isInCompare ? "Remove from compare" : "Add to compare"}
            >
              +
            </button>
            <button
              onClick={e => toggleFavorite(e, place.id)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: isFav ? "#fbbf24" : isSelected ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)", flexShrink: 0, padding: "0.25rem", lineHeight: 1 }}
              aria-label={isFav ? "Remove from saved" : "Save"}
            >
              {isFav ? "★" : "☆"}
            </button>
          </div>
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
                { id: "level", value: level, setter: (v: string|null) => reset({ level: v }), options: LEVEL_OPTIONS, placeholder: "Level" },
                { id: "size",  value: size,  setter: (v: string|null) => reset({ size: v }),  options: SIZE_OPTIONS,  placeholder: "Size"  },
                { id: "vert",  value: vert,  setter: (v: string|null) => reset({ vert: v }),  options: VERT_OPTIONS,  placeholder: "Vert"  },
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

              {/* Terrain: add-one-at-a-time select */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <select value="" onChange={e => { if (e.target.value) toggleTerrain(e.target.value); }} style={mobileSelectStyle}>
                  <option value="">Terrain{terrain.length > 0 ? ` · ${terrain.length}` : ""}</option>
                  {TERRAIN_OPTIONS.filter(o => o.value).map(o => <option key={String(o.value)} value={String(o.value)}>{terrain.includes(o.value!) ? "✓ " : ""}{o.label}</option>)}
                </select>
                {terrain.length > 0 && <span style={{ position: "absolute", top: "-4px", right: "-4px", width: "8px", height: "8px", borderRadius: "50%", background: "var(--bx-primary,#2b44ff)" }} />}
                <span style={{ position: "absolute", right: "0.35rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "0.55rem", opacity: 0.5 }}>▼</span>
              </div>

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

              {/* My level quiz */}
              <button onClick={() => setShowQuiz(true)} style={{ height: "44px", padding: "0 0.6rem", border: "2px solid currentColor", background: "transparent", cursor: "pointer", fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0, color: "inherit", whiteSpace: "nowrap" }}>
                My level
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
              <div ref={sentinelRef} style={{ height: 1 }} />
            </div>
          </div>
        )}

        {/* Compare floating bar */}
        {compareIds.size >= 2 && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "var(--bx-primary,#2b44ff)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderTop: "3px solid currentColor" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Compare {compareIds.size} resorts</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => setShowCompare(true)} style={{ border: "2px solid #fff", background: "#fff", color: "var(--bx-primary,#2b44ff)", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" }}>View →</button>
              <button onClick={() => setCompareIds(new Set())} style={{ border: "2px solid rgba(255,255,255,0.6)", background: "transparent", color: "#fff", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 900 }}>×</button>
            </div>
          </div>
        )}

        {/* Overlays */}
        {showQuiz && <QuizModal onClose={() => setShowQuiz(false)} onResult={(lvl) => { setLevel(lvl); setShowQuiz(false); }} />}
        {showCompare && <CompareOverlay compareIds={compareIds} places={places} onClose={() => setShowCompare(false)} />}
        {showTrip && <TripOverlay tripIds={tripIds} places={places} onClose={() => setShowTrip(false)} onRemove={id => { setTripIds(prev => { const next = new Set(prev); next.delete(id); try { localStorage.setItem(SK_TRIP, JSON.stringify([...next])); } catch {} return next; }); }} />}
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
            <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap" }}>
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
              {/* Trip counter */}
              {tripIds.size > 0 && (
                <button
                  onClick={() => setShowTrip(true)}
                  style={{ border: "2px solid currentColor", background: "transparent", padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}
                >
                  Trip · {tripIds.size}
                </button>
              )}
              {/* Find my level */}
              <button
                onClick={() => setShowQuiz(true)}
                style={{ border: "2px solid currentColor", background: "transparent", padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}
              >
                Find my level
              </button>
              {/* Compact toggle */}
              <button
                onClick={() => setCompactCards(v => !v)}
                style={{ border: "2px solid currentColor", background: compactCards ? "currentColor" : "transparent", color: compactCards ? "var(--bx-paper,#fff)" : "inherit", padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.05em", whiteSpace: "nowrap" }}
                aria-label="Toggle compact cards"
                title="Toggle compact cards"
              >
                ≡
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
                const active = level === p.level && (p.terrain ? terrain.length === 1 && terrain[0] === p.terrain : terrain.length === 0) && size === p.size && vert === p.vert;
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
                {TERRAIN_OPTIONS.map(o => <Pill key={String(o.value)} label={o.label} hint={o.hint} active={o.value === null ? terrain.length === 0 : terrain.includes(o.value)} onClick={() => toggleTerrain(o.value)} />)}
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
        <div ref={sentinelRef} style={{ height: 1 }} />

        {/* Compare floating bar */}
        {compareIds.size >= 2 && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "var(--bx-primary,#2b44ff)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderTop: "3px solid currentColor" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Compare {compareIds.size} resorts</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => setShowCompare(true)} style={{ border: "2px solid #fff", background: "#fff", color: "var(--bx-primary,#2b44ff)", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" }}>View →</button>
              <button onClick={() => setCompareIds(new Set())} style={{ border: "2px solid rgba(255,255,255,0.6)", background: "transparent", color: "#fff", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 900 }}>×</button>
            </div>
          </div>
        )}

        {/* Overlays */}
        {showQuiz && <QuizModal onClose={() => setShowQuiz(false)} onResult={(lvl) => { setLevel(lvl); setShowQuiz(false); }} />}
        {showCompare && <CompareOverlay compareIds={compareIds} places={places} onClose={() => setShowCompare(false)} />}
        {showTrip && <TripOverlay tripIds={tripIds} places={places} onClose={() => setShowTrip(false)} onRemove={id => { setTripIds(prev => { const next = new Set(prev); next.delete(id); try { localStorage.setItem(SK_TRIP, JSON.stringify([...next])); } catch {} return next; }); }} />}
      </div>
    </div>
  );
}
